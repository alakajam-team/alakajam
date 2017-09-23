'use strict'

/**
 * Utilities made available in all templates
 *
 * @module controllers/templating
 */

const constants = require('../core/constants')
const forms = require('../core/forms')
const securityService = require('../services/security-service')
const postService = require('../services/post-service')

const DASHBOARD_PAGES = ['feed', 'posts', 'entries', 'invite', 'settings', 'password']

module.exports = {
  buildUrl,

  min: Math.min,
  max: Math.max,

  isId: forms.isId,

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
      } else if (page === 'ajax-find-team-mate') {
        return '/external-entry/ajax-find-team-mate'
      } else {
        return '/create-event'
      }
    } else if (type === 'entry') {
      // Entry model
      const array = ['', model.get('event_name') || 'external-entry']
      if (model.id) {
        array.push(model.get('id'), model.get('name'), page)
      } else {
        array.push(page || 'create-entry')
      }
      return array.join('/').replace('//', '/')
    } else if (type === 'user') {
      // User Role model / User model
      if (DASHBOARD_PAGES.indexOf(page) !== -1) {
        if (options.dashboardAdminMode) {
          page += '?user=' + model.get('name')
        }
        let fullPath = '/dashboard/' + page
        if (model) {
          return fullPath
        } else {
          return '/login?redirect=' + fullPath
        }
      } else {
        let userName = model.get('name') || model.get('user_name')
        return '/user/' + userName + pagePath
      }
    } else if (type === 'post') {
      // Post model
      if (page === 'create') {
        pagePath += '?'
        if (options.eventId) pagePath += 'eventId=' + options.eventId
        if (options.entryId) pagePath += '&entryId=' + options.entryId
        if (options.specialPostType) pagePath += '&special_post_type=' + options.specialPostType
        if (options.title) pagePath += '&title=' + options.title
        return '/post' + pagePath
      } else if (model && typeof model === 'object') {
        return '/post/' + model.id + '/' + (model.get('name') || 'untitled') + pagePath
      } else {
        return '/post/' + model
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
    throw new Error('Failed to build URL for model "' + model + '" of type "' + type + '": ' + e.message)
  }
}
