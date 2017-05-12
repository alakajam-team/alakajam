'use strict'

/**
 * Utilities made available in all templates
 *
 * @module controllers/templating
 */

const log = require('../core/log')
const securityService = require('../services/security-service')

module.exports = {
  buildUrl,
  
  canUserRead: securityService.canUserRead,
  canUserWrite: securityService.canUserWrite,
  canUserManage: securityService.canUserManage
}

function buildUrl (model, type, page = null) {
  let pagePath = (page ? '/' + page : '')

  if (type === 'event') {
    // Event model
    return '/event/' + model.get('uuid') + pagePath

  } else if (type === 'entry') {
    // Entry model
    if (model && model.get('uuid')) {
      return '/entry/' + model.get('uuid') + pagePath
    } else {
      return '/event/' + model.get('event_uuid') + '/create-entry'
    }

  } else if (type === 'user') {
    // User model
    let userUuid = model.get('name') || model.get('user_name')
    return '/user/' + userUuid + pagePath

  } else if (type === 'post') {
    // Post model
    let postId = model.get('id')
    return '/post/' + postId + pagePath

  } else {
    throw new Error('Unknown model type ' + type)
  }
}
