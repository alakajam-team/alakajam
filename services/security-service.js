'use strict'

/**
 * Security service. Helps with checking permissions.
 *
 * @module services/security-service
 */

const PERMISSION_READ ='read'
const PERMISSION_WRITE = 'write'
const PERMISSION_MANAGE = 'manage'
const ORDERED_PERMISSIONS = [PERMISSION_READ, PERMISSION_WRITE, PERMISSION_MANAGE]

module.exports = {
  PERMISSION_READ,
  PERMISSION_WRITE,
  PERMISSION_MANAGE,
  ORDERED_PERMISSIONS,

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
 * @param  {Entry|Post} model
 * @param  {object options (optional) allowMods allowAdmins
 * @return {boolean}
 */
function canUserRead(user, model, options = {}) {
  return canUser(user, model, PERMISSION_READ, options)
}

/**
 * Checks if a user can write in the given model
 * @param  {User} user (optional)
 * @param  {Entry|Post} model
 * @param  {object options (optional) allowMods allowAdmins
 * @return {boolean}
 */
function canUserWrite(user, model, options = {}) {
  return canUser(user, model, PERMISSION_WRITE, options)
}

/**
 * Checks if a user can manage the given model
 * @param  {User} user (optional)
 * @param  {Entry|Post} model
 * @param  {object options (optional) allowMods allowAdmins
 * @return {boolean}
 */
function canUserManage(user, model, options = {}) {
  return canUser(user, model, PERMISSION_MANAGE, options)
}

function canUser(user, model, permission, options = {}) {
  if (!user) {
    return false
  }
  if (!model.relations.userRoles) {
    throw new Error('Model does not have user roles')
  }

  if (options.allowMods && isMod(user) || options.allowAdmins && isAdmin(user)) {
    return true
  }

  let acceptPermissions = getPermissionsEqualOrAbove(permission)
  let allUserRoles = model.related('userRoles')
  if (acceptPermissions && allUserRoles) {
    let userRoles = allUserRoles.where({
      user_uuid: user.get('uuid')
    })
    for (let userRole of userRoles) {
      if (acceptPermissions.indexOf(userRole.get('permission'))) {
        return true
      }
    }
  }
  return false
}

function isMod (user) {
  return user && (user.get('is_mod') || user.get('is_admin'))
}

function isAdmin (user) {
  return user && user.get('is_admin')
}

function getPermissionsEqualOrAbove (permission) {
  let permissionIndex = ORDERED_PERMISSIONS.indexOf(permission)
  if (permissionIndex !== -1) {
    return ORDERED_PERMISSIONS.slice(permissionIndex)
  } else {
    log.warn('Unknown permission: ' + permission + ' (allowed: ' + ORDERED_PERMISSIONS.join(',') + ')')
    return false
  }
}
