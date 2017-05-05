'use strict'

/**
 * Utility made available in all templates to build URLs
 *
 * @module controllers/build-url
 */

module.exports = function buildUrl (model, type, page = null) {
  let pagePath = (page ? '/' + page : '')
  if (type === 'event') {
    return '/event/' + model.get('uuid') + pagePath
  } else if (type === 'entry') {
    return '/entry/' + model.get('uuid') + pagePath
  } else {
    throw new Error('Unknown model type ' + type)
  }
}
