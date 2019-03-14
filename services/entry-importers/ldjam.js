'use strict'

/**
 * ldjam.com entry importer
 *
 * @module services/entry-importers/ldjam
 */

const download = require('download')
const log = require('../../core/log')
const forms = require('../../core/forms')
const enums = require('../../core/enums')
const cache = require('../../core/cache')
const leftPad = require('left-pad')
const entryImporterTools = require('./entry-importer-tools')

module.exports = {
  config: {
    id: 'ldjam.com',
    title: 'Ludum Dare (ldjam.com)',
    mode: 'scraping'
  },
  fetchEntryReferences,
  fetchEntryDetails
}

async function fetchEntryReferences (profileIdentifier) {
  let profileName
  if (profileIdentifier.includes('://')) {
    profileName = profileIdentifier.replace(/\/$/, '').replace(/^.*\//, '')
  } else {
    profileName = profileIdentifier
  }

  // Fetch user ID
  let profileId = null
  try {
    let rawPage = await download(`https://api.ldjam.com/vx/node/walk/1/users/${profileName}`)
    let userIdInfo = JSON.parse(rawPage)
    if (userIdInfo.path && userIdInfo.path.length === 2) {
      profileId = userIdInfo.path[1]
    }
  } catch (e) {
    log.warn('Failed to download user info')
    console.warn(e)
    return { error: 'Failed to download user info' }
  }
  if (profileId === null) {
    return { error: 'Unknown user name' }
  }

  // Fetch user entry IDs
  // XXX No support for >25 games
  let userEntriesUrl = `https://api.ldjam.com/vx/node/feed/${profileId}/authors/item/game?limit=25`
  let entriesIds = null
  try {
    let rawPage = await download(userEntriesUrl)
    let entriesInfo = JSON.parse(rawPage)
    if (entriesInfo.feed) {
      entriesIds = entriesInfo.feed.map(node => node.id)
    }
  } catch (e) {
    log.warn('Failed to download user game IDs')
    console.warn(e)
    return { error: 'Failed to download user game IDs' }
  }
  if (entriesIds === null) {
    return { error: 'No game IDs data found' }
  }

  // Fetch entry info
  let entryNodesUrl = 'https://api.ldjam.com/vx/node/get/' + entriesIds.join('+')
  let entriesData = null
  try {
    let rawPage = await download(entryNodesUrl)
    let data = JSON.parse(rawPage)
    if (data.node) {
      entriesData = data.node
    }
  } catch (e) {
    log.warn('Failed to download user games')
    console.warn(e)
    return { error: 'Failed to download user games' }
  }
  if (entriesData === null) {
    return { error: 'No game data found' }
  }

  // Build entry references
  let entryReferences = []
  for (let game of entriesData) {
    // Path format: "/events/ludum-dare/[number]/game-name"
    let pathTokens = game.path.split('/')
    let eventName = entryImporterTools.capitalizeAllWords(pathTokens[2].replace(/-/g, ' ')) + ' ' + pathTokens[3]
    let thumbnailPicture = _replaceTripleSlashes(game.meta.cover)

    entryReferences.push({
      id: 'ldjam-' + profileName + '-' + game.id,
      title: forms.sanitizeString(game.name),
      link: 'https://ldjam.com' + game.path,
      thumbnail: forms.isURL(thumbnailPicture) ? thumbnailPicture : null,
      importerProperties: {
        externalEvent: forms.sanitizeString(eventName),
        published: game.published,
        meta: game.meta,
        body: forms.sanitizeMarkdown(game.body)
      }
    })
  }

  return entryReferences
}

async function fetchEntryDetails (entryReference) {
  // Transform links data
  let meta = entryReference.importerProperties.meta
  let tagNames = await _fetchLDJamTagNames()
  let links = []
  for (let linkNumber = 1; linkNumber < 20; linkNumber++) {
    let linkKey = 'link-' + leftPad(linkNumber, 2, '0')
    if (meta[linkKey]) {
      let label = meta[linkKey + '-name'] || tagNames[meta[linkKey + '-tag']]
      if (label) {
        links.push({
          url: meta[linkKey],
          label
        })
      }
    }
  }

  // Guess platforms
  let linksText = links.map(link => link.label).join(' ')
  let platforms = entryImporterTools.guessPlatforms(linksText)

  // Build entry details
  links.push({
    label: 'Ludum Dare entry page',
    url: entryReference.link
  })
  let regex = new RegExp('!\[[^\\]]*\]\\(' + meta.cover + '\\)')
  let body = entryReference.importerProperties.body ? entryReference.importerProperties.body.replace(regex, '').trim() : ''

  let entryDetails = {
    title: entryReference.title,
    externalEvent: entryReference.importerProperties.externalEvent,
    published: entryReference.importerProperties.published,
    picture: entryReference.thumbnail,
    body: _replaceTripleSlashes(body),
    division: meta.author.length > 1 ? enums.DIVISION.TEAM : enums.DIVISION.SOLO,
    platforms,
    links
  }

  return entryDetails
}

function _replaceTripleSlashes (string) {
  return string ? string.replace(/\/\/\//g, 'https://static.jam.vg/') : string
}

async function _fetchLDJamTagNames () {
  return cache.getOrFetch(cache.entryImport, 'ldjamtagnames', async function () {
    try {
      let rawPage = await download('https://api.ldjam.com/vx/tag/get/platform')
      let tags = JSON.parse(rawPage).tag
      let platforms = {}
      tags.forEach(tag => {
        platforms[tag.id] = tag.name
      })
      return platforms
    } catch (e) {
      return { error: 'Failed to download platforms data' }
    }
  })
}
