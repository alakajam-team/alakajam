'use strict'

/**
 * Functions for helping with entry importer implementations
 *
 * @module services/entry-importers/entry-importers-tools
 */

module.exports = {
  guessPlatforms,
  capitalizeAllWords
}

const PLATFORM_KEYWORDS = {
  'Windows': ['windows', 'win32', 'win64', 'exe', 'java', 'jar'],
  'Linux': ['linux', 'debian', 'ubuntu', 'java', 'jar'],
  'Mac': ['mac', 'osx', 'os/x', 'os x', 'java', 'jar'],
  'Mobile': ['android', 'apk'],
  'Web': ['web', 'flash', 'swf', 'html', 'webgl', 'canvas']
}

function guessPlatforms (text) {
  let normalizedText = text.toLowerCase()
  let platforms = []
  for (let platform in PLATFORM_KEYWORDS) {
    for (let platformKeyword of PLATFORM_KEYWORDS[platform]) {
      if (normalizedText.indexOf(platformKeyword) !== -1) {
        platforms.push(platform)
        break
      }
    }
  }
  return platforms
}

function capitalizeAllWords (str) {
  // Source: https://stackoverflow.com/a/38530325/1213677
  return str.replace(/(^|\s)\S/g, l => l.toUpperCase())
}
