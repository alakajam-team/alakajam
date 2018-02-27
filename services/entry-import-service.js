const download = require('download')
const path = require('path')
const promisify = require('promisify-node')
const fs = promisify('fs')
const url = require('url')
const config = require('../config')
const log = require('../core/log')
const fileStorage = require('../core/file-storage')
const cache = require('../core/cache')
const importerLudumdare = require('./entry-importers/ludumdare')
const eventService = require('./event-service')

/**
 * Importers spec:
 *
 * > fetchEntryReferences(profileNameOrUrl)
 *
 * Returns an array of entry references. Each entry reference holds:
 *   - id = Unique entry ID (use the importer name + profile name + remote entry ID to generate this). Must be usable as a filename.
 *   - title = Entry title
 *   - link = Optional link to the remote entry
 *   - thumbnail = Optional remote thumbnail picture of the entry
 *   - importerProperties = Any additional info required by the importer for downloading the entry details
 *
 * > fetchEntryDetails(entryReference)
 *
 * Grabs the detailed info of an entry. The object holds:
 *   - title = Entry title
 *   - externalEvent = Event title
 *   - picture = Optional URL of a picture to download
 *   - links = An array of links to play the game [{url, label}]
 *   - platforms = Optional array of entry platforms
 *   - body = Detailed description (plain text or Markdown, no HTML)
 */
const importers = [
  { id: 'ludumdare.com', title: 'Ludum Dare legacy site (ludumdare.com)', importer: importerLudumdare }
]

module.exports = {
  getAvailableImporters,
  fetchEntryReferences,
  createOrUpdateEntry
}

function getAvailableImporters () {
  return importers
}

async function fetchEntryReferences (user, importerId, profileNameOrUrl) {
  // Fetch and cache entry list
  let cacheKey = importerId + '-' + profileNameOrUrl
  let entryReferences = await cache.getOrFetch(cache.entryImport, cacheKey, async function () {
    try {
      let importer = _getImporter(importerId)
      if (importer) {
        return await importer.fetchEntryReferences(profileNameOrUrl)
      } else {
        return { error: 'No importer found with name ' + importerId }
      }
    } catch (e) {
      const error = 'Failed to fetch entry list'
      console.error(error, e)
      return { error }
    }
  })

  if (!entryReferences.error) {
    // Enhance result by detecting existing entries
    let entries = await eventService.findUserEntries(user)
    for (let entryReference of entryReferences) {
      entryReference.existingEntry = entries.find(entry => entry.get('external_event') && entry.get('title') === entryReference.title)
    }
  } else {
    // Don't cache failures
    cache.entryImport.del(cacheKey)
  }

  return entryReferences
}

async function createOrUpdateEntry (user, importerId, profileNameOrUrl, entryId) {
  try {
    // Find entry reference (hopefully cached)
    let entryReferences = await fetchEntryReferences(user, importerId, profileNameOrUrl)
    if (entryReferences.error) {
      return { error: 'Failed to fetch entry list before downloading entry' }
    }
    let entryReference = entryReferences.find(entryReference => entryReference.id === entryId)
    if (!entryReference) {
      log.error(`Entry not found: ${profileNameOrUrl} ${entryId}`)
      return { error: 'Entry not found for this profile' }
    }

    // Fetch details
    let importer = _getImporter(importerId)
    if (!importer) {
      return { error: 'No importer found with name ' + importerId }
    }
    let entryDetails = await importer.fetchEntryDetails(entryReference)
    if (entryDetails.error) {
      return { error: entryDetails.error }
    }

    // Create entry or force refreshing existing one (due to fetchEntryReferences() caching)
    let entryModel
    if (!entryReference.existingEntry) {
      entryModel = await eventService.createEntry(user, null)
    } else {
      entryModel = await eventService.findEntryById(entryReference.existingEntry.get('id'))
    }

    // Set model info
    entryModel.set({
      title: entryDetails.title,
      external_event: entryDetails.externalEvent,
      platforms: entryDetails.platforms || [],
      links: entryDetails.links.map(link => ({ // ensure data format, just in case
        label: link.label,
        url: link.url
      }))
    })
    let entryDetailsModel = entryModel.related('details')
    entryDetailsModel.set('body', entryDetails.body)

    if (entryDetails.picture) {
      // Choose temporary path
      let temporaryPath = false
      try {
        let extension = path.extname(url.parse(entryDetails.picture).pathname) || ''
        temporaryPath = path.join(__dirname, '..', config.DATA_PATH, 'tmp', entryReference.id + extension)
      } catch (e) {
        log.warn('Failed to detect picture file name of ' + entryDetails.picture)
        console.log(e)
      }

      // Download picture in temporary path
      if (temporaryPath) {
        let downloadSuccessful = false
        try {
          let pictureData = await download(entryDetails.picture)
          await fs.writeFile(temporaryPath, pictureData)
          await fs.access(temporaryPath, fs.constants.R_OK)
          downloadSuccessful = true
        } catch (e) {
          log.warn('Failed to download entry picture ' + entryDetails.picture + ' to ' + temporaryPath)
          console.log(e)
        }

        // Create actual entry picture
        if (downloadSuccessful) {
          let picturePath = '/entry/' + entryModel.get('id')
          let finalPath = false
          try {
            finalPath = await fileStorage.savePictureUpload(temporaryPath, picturePath)
          } catch (e) {
            log.warn('Failed to save picture upload ' + temporaryPath)
            console.log(e)
          }

          // Delete temporary picture if needed
          fs.unlink(temporaryPath)

          // Save actual picture
          if (finalPath) {
            entryModel.set('pictures', [finalPath])
          }
        }
      }
    }

    // Save entry
    await Promise.all([ entryModel.save(), entryDetailsModel.save() ])

    return entryModel
  } catch (e) {
    const error = 'Failed to fetch entry details'
    console.error(error, e)
    return { error }
  }
}

function _getImporter (id) {
  let entry = importers.find(importer => importer.id === id)
  return entry ? entry.importer : null
}
