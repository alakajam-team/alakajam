'use strict'

/**
 * Utilities made available in all templates
 *
 * @module controllers/templating
 */

const log = require('../core/log')

module.exports = {
  buildUrl,
  hasPermission
}

const ROLE_ORDER = ['read', 'write', 'owner']

function buildUrl (model, type, page = null) {
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

function hasPermission (user, model, minimalRole) {
  if (user) {
    let acceptRoles = getRolesEqualOrAbove(minimalRole)
    let allUserRoles = model.related('userRoles')
    if (acceptRoles && allUserRoles) {
      let userRoles = allUserRoles.where({
        user_uuid: user.get('uuid')
      })
      for (let userRole of userRoles) {
        if (acceptRoles.indexOf(userRole.get('role'))) {
          return true
        }
      }
    }
  }
  return false
}

function getRolesEqualOrAbove (role) {
  let roleIndex = ROLE_ORDER.indexOf(role)
  if (roleIndex !== -1) {
    return ROLE_ORDER.slice(roleIndex)
  } else {
    log.warn('Unknown role: ' + role + ' (allowed: ' + ROLE_ORDER.join(',') + ')')
    return false
  }
}
