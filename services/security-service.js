'use strict'

/**
 * Security service. Helps with checking permissions.
 *
 * @module services/security-service
 */

const constants = require('../core/constants')
const log = require('../core/log')

module.exports = {
  canUserRead,
  canUserWrite,
  canUserManage,
  isMod,
  isAdmin,
  getPermissionsEqualOrAbove
}

/**
 * Checks if a user can read the given model
 * @param  {User} user (optional)
 * @param  {Entry|Post|Comment} model
 * @param  {object} options (optional) allowMods allowAdmins
 * @return {boolean}
 */
function canUserRead (user, model, options = {}) {
  return canUser(user, model, constants.PERMISSION_READ, options)
}

/**
 * Checks if a user can write in the given model
 * @param  {User} user (optional)
 * @param  {Entry|Post|Comment} model
 * @param  {object} options (optional) allowMods allowAdmins
 * @return {boolean}
 */
function canUserWrite (user, model, options = {}) {
  return canUser(user, model, constants.PERMISSION_WRITE, options)
}

/**
 * Checks if a user can manage the given model
 * @param  {User} user (optional)
 * @param  {Entry|Post|Comment} model
 * @param  {object} options (optional) allowMods allowAdmins
 * @return {boolean}
 */
function canUserManage (user, model, options = {}) {
  return canUser(user, model, constants.PERMISSION_MANAGE, options)
}

function canUser (user, model, permission, options = {}) {
  if (!user) {
    return false
  }
  if ((options.allowMods && isMod(user)) || (options.allowAdmins && isAdmin(user))) {
    return true
  }

  // Comments
  if (model.get('user_id')) {
    return model.get('user_id') === user.get('id')
  }

  // User/Posts (permission-based)
  if (!model.relations.userRoles) {
    throw new Error('Model does not have user roles')
  }
  let acceptPermissions = getPermissionsEqualOrAbove(permission)
  let allUserRoles = model.related('userRoles')
  if (acceptPermissions && allUserRoles) {
    let userRoles = allUserRoles.where({
      user_id: user.get('id')
    })
    for (let userRole of userRoles) {
      if (acceptPermissions.indexOf(userRole.get('permission'))) {
        return true
      }
    }
  }
  return false
}

/**
 * @param  {User}  user
 * @return {boolean}
 */
function isMod (user) {
  return user && (user.get('is_mod') || user.get('is_admin'))
}

/**
 * @param  {User}  user
 * @return {boolean}
 */
function isAdmin (user) {
  return user && user.get('is_admin')
}

/**
 * @param  {string} permission
 * @return {array(string)}
 */
function getPermissionsEqualOrAbove (permission) {
  let permissionIndex = constants.ORDERED_PERMISSIONS.indexOf(permission)
  if (permissionIndex !== -1) {
    return constants.ORDERED_PERMISSIONS.slice(permissionIndex)
  } else {
    log.warn('Unknown permission: ' + permission + ' (allowed: ' + constants.ORDERED_PERMISSIONS.join(',') + ')')
    return false
  }
}
