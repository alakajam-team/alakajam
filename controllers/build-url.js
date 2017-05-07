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
    if (model && model.get('uuid')) {
      return '/entry/' + model.get('uuid') + pagePath
    } else {
      return '/event/' + model.get('event_uuid') + '/create-entry'
    }
  } else {
    throw new Error('Unknown model type ' + type)
  }
}
