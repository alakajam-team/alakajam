'use strict'

/**
 * Utilities made available in all templates
 *
 * @module controllers/templating
 */

const securityService = require('../services/security-service')
const postService = require('../services/post-service')

module.exports = {
  buildUrl,

  isPast: postService.isPast,

  canUserRead: securityService.canUserRead,
  canUserWrite: securityService.canUserWrite,
  canUserManage: securityService.canUserManage
}

function buildUrl (model, type, page = null) {
  let pagePath = (page ? '/' + page : '')

  if (type === 'event') {
    // Event model
    return '/event/' + model.get('name') + pagePath
  } else if (type === 'entry') {
    // Entry model
    if (model && model.get('id')) {
      return '/entry/' + model.get('id') + pagePath
    } else {
      return '/event/' + model.get('event_name') + '/create-entry'
    }
  } else if (type === 'user') {
    // User model
    let userId = model.get('name') || model.get('user_name')
    return '/user/' + userId + pagePath
  } else if (type === 'post') {
    // Post model
    let postId = model.get('id')
    return '/post/' + postId + pagePath
  }
}
