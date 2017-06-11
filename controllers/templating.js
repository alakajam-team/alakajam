'use strict'

/**
 * Utilities made available in all templates
 *
 * @module controllers/templating
 */

const securityService = require('../services/security-service')
const postService = require('../services/post-service')

const DASHBOARD_PAGES = ['posts', 'invite', 'settings', 'password']

module.exports = {
  buildUrl,

  isPast: postService.isPast,
  wasEdited: postService.wasEdited,

  canUserRead: securityService.canUserRead,
  canUserWrite: securityService.canUserWrite,
  canUserManage: securityService.canUserManage,
  isAdmin: securityService.isAdmin,
  isMod: securityService.isMod
}

function buildUrl (model, type, page = null, options = {}) {
  try {
    let pagePath = (page ? '/' + page : '')

    if (type === 'event') {
      // Event model
      if (model && model.id) {
        return '/' + model.get('name') + pagePath
      } else {
        return '/create-event'
      }
    } else if (type === 'entry') {
      // Entry model
      if (model && model.id) {
        return '/' + model.get('event_name') + '/' + model.id + '/' + model.get('name') + pagePath
      } else {
        return '/' + model.get('event_name') + '/create-entry'
      }
    } else if (type === 'user') {
      // User Role model / User model
      if (DASHBOARD_PAGES.indexOf(page) !== -1) {
        if (options.dashboardAdminMode) {
          page += '?user=' + model.get('name')
        }
        return '/dashboard/' + page
      } else {
        let userId = model.get('name') || model.get('user_name')
        return '/user/' + userId + pagePath
      }
    } else if (type === 'post') {
      // Post model
      if (page === 'create') {
        pagePath += '?'
        if (options.eventId) pagePath += 'eventId=' + options.eventId
        if (options.entryId) pagePath += '&entryId=' + options.entryId
        return '/post' + pagePath
      } else {
        return '/post/' + model.id + '/' + model.get('name') + pagePath
      }
    } else if (type === 'comment') {
      // Comment model
      let pageParams = ''
      if (model && page === 'edit') {
        pageParams = 'editComment=' + model.id
      }
      return '?' + pageParams + (model ? '#c' + model.id : '')
    }
  } catch (e) {
    throw new Error('Failed to build URL for model "' + model + '" of type "' + type + '"')
  }
}
