'use strict'

/**
 * Service for importing entries from third-party websites
 *
 * @module services/event-import-service
 */

const download = require('download')
const path = require('path')
const promisify = require('promisify-node')
const fs = promisify('fs')
const url = require('url')
const config = require('../config')
const log = require('../core/log')
const fileStorage = require('../core/file-storage')
const cache = require('../core/cache')
const enums = require('../core/enums')
const eventService = require('./event-service')

/**
 * Importers spec:
 *
 * > config
 *
 * Constants to configure the importer.
 *   - id = some unique string
 *   - title = full importer name as listed on the client-side
 *   - mode = 'scraping' or 'oauth'
 *   - oauthUrl = URL to send the user to, in case 'oauth' mode has been selected
 *
 * > fetchEntryReferences(profileIdentifier)
 *
 * 'identifier' is either an OAuth authorization key (if mode is 'oauth'), or a profile name/URL otherwise.
 * The function must return an array of entry references. Each entry reference holds:
 *   - id = Unique entry ID (use the importer name + profile name + remote entry ID to generate this). Must be usable as a filename.
 *   - title = Entry title
 *   - link = Optional link to the remote entry
 *   - thumbnail = Optional remote thumbnail picture of the entry
 *   - importerProperties = Any additional info required by the importer for downloading the entry details
 *
 * > fetchEntryDetails(entryReference)
 *
 * The function grabs the detailed info of an entry. The object holds:
 *   - title = Entry title
 *   - externalEvent = Event title
 *   - published = Optional entry publication date
 *   - picture = Optional URL of a picture to download
 *   - links = An array of links to play the game [{url, label}]
 *   - platforms = Optional array of entry platforms
 *   - description = Optional short description (plain text)
 *   - body = Detailed description (plain text or Markdown, no HTML)
 *   - division = Optional game division (solo/team)
 */
const importers = [
  require('./entry-importers/itch'),
  require('./entry-importers/ludumdare'),
  require('./entry-importers/ldjam')
]

module.exports = {
  getAvailableImporters,
  fetchEntryReferences,
  createOrUpdateEntry
}

function getAvailableImporters () {
  return importers
}

async function fetchEntryReferences (user, importerId, profileIdentifier) {
  // Fetch and cache entry list
  let cacheKey = importerId + '-' + profileIdentifier
  let entryReferences = await cache.getOrFetch(cache.entryImport, cacheKey, async function () {
    try {
      let importer = _getImporter(importerId)
      if (importer) {
        return await importer.fetchEntryReferences(profileIdentifier)
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
      entryReference.existingEntry = entries.find(entry => entry.get('event_name') === null && entry.get('title') === entryReference.title)
    }
  } else {
    // Don't cache failures
    cache.entryImport.del(cacheKey)
  }

  return entryReferences
}

async function createOrUpdateEntry (user, importerId, profileIdentifier, entryId) {
  try {
    // Find entry reference (hopefully cached)
    let entryReferences = await fetchEntryReferences(user, importerId, profileIdentifier)
    if (entryReferences.error) {
      return { error: 'Failed to fetch entry list before downloading entry' }
    }
    let entryReference = entryReferences.find(entryReference => entryReference.id === entryId)
    if (!entryReference) {
      log.error(`Entry not found: ${profileIdentifier} ${entryId}`)
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
      description: entryDetails.description || null,
      division: entryDetails.division || enums.DIVISION.SOLO,
      platforms: entryDetails.platforms || [],
      published_at: entryDetails.published || null,
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
          let result = await eventService.setEntryPicture(entryModel, temporaryPath)
          if (result.error) {
            log.warn('Failed to save picture upload ' + temporaryPath)
            log.warn(result.error)
          }

          // Delete temporary picture if needed
          fs.unlink(temporaryPath)
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
  let found = importers.find(importer => importer.config.id === id)
  return found || null
}
