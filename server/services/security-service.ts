
/**
 * Security service. Helps with checking permissions.
 *
 * @module services/security-service
 */

import constants from "../core/constants";
import log from "../core/log";
import * as models from "../core/models";

export default {
  isUserWatching,
  canUserRead,
  canUserWrite,
  canUserManage,

  isMod,
  isAdmin,

  getPermissionsEqualOrAbove,
  getHighestPermission,

  addUserRight,
  removeUserRight,
};

/**
 * Checks if a user is watching the given model
 * @param  {User} user (optional)
 * @param  {Entry|Post|Comment} model
 * @return {boolean}
 */
function isUserWatching(user, model) {
  return canUser(user, model, constants.PERMISSION_WATCH);
}

/**
 * Checks if a user can read the given model
 * @param  {User} user (optional)
 * @param  {Entry|Post|Comment} model
 * @param  {object} options (optional) allowMods allowAdmins
 * @return {boolean}
 */
function canUserRead(user, model, options: any = {}) {
  return canUser(user, model, constants.PERMISSION_READ, options);
}

/**
 * Checks if a user can write in the given model
 * @param  {User} user (optional)
 * @param  {Entry|Post|Comment} model
 * @param  {object} options (optional) allowMods allowAdmins
 * @return {boolean}
 */
function canUserWrite(user, model, options: any = {}) {
  return canUser(user, model, constants.PERMISSION_WRITE, options);
}

/**
 * Checks if a user can manage the given model. Always returns false if no model is given.
 * @param  {User} (optional) user
 * @param  {Entry|Post|Comment} (optional) model
 * @param  {object} options (optional) allowMods allowAdmins
 * @return {boolean}
 */
function canUserManage(user, model, options: any = {}) {
  return canUser(user, model, constants.PERMISSION_MANAGE, options);
}

function canUser(user, model, permission, options: any = {}) {
  if (!user || !model) {
    return false;
  }
  if ((options.allowMods && isMod(user)) || (options.allowAdmins && isAdmin(user))) {
    return true;
  }

  // Comments
  if (model.get("user_id")) {
    if (permission === constants.PERMISSION_READ) {
      return canUser(user, model.related("node"), permission, options);
    } else {
      return model.get("user_id") === user.get("id");
    }
  }

  // User/Posts (permission-based)
  if (!model.relations.userRoles) {
    throw new Error("Model does not have user roles");
  }
  const acceptPermissions = getPermissionsEqualOrAbove(permission);
  const allUserRoles = model.related("userRoles");
  if (acceptPermissions && allUserRoles) {
    const userRoles = allUserRoles.where({
      user_id: user.get("id"),
    });
    for (const userRole of userRoles) {
      if (acceptPermissions.includes(userRole.get("permission"))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param  {User}  user
 * @return {boolean}
 */
function isMod(user) {
  return user && (user.get("is_mod") || user.get("is_admin"));
}

/**
 * @param  {User}  user
 * @return {boolean}
 */
function isAdmin(user, options: any = {}) {
  return user && user.get("is_admin");
}

/**
 * @param  {string} permission
 * @return {array(string)}
 */
function getPermissionsEqualOrAbove(permission) {
  const permissionIndex = constants.ORDERED_PERMISSIONS.indexOf(permission);
  if (permissionIndex !== -1) {
    return constants.ORDERED_PERMISSIONS.slice(permissionIndex);
  } else {
    throw new Error("Unknown permission: " + permission
      + " (allowed: " + constants.ORDERED_PERMISSIONS.join(",") + ")");
  }
}

/**
 * @param {array(string)} permissions
 * @return {string}
 */
function getHighestPermission(permissions) {
  const highestIndex = permissions
    .map((permission) => constants.ORDERED_PERMISSIONS.indexOf(permission))
    .reduce((index1, index2) => Math.max(index1, index2), -1);
  return constants.ORDERED_PERMISSIONS[highestIndex];
}

/**
 * Adds a user right to a node
 * @param  {User} user
 * @param  {Entry|Post} node
 * @param  {string} nodeType (entry|post)
 * @param  {string} permission
 * @return {boolean}
 */
async function addUserRight(user, node, nodeType, permission) {
  await node.load("userRoles");

  // Check if present already
  const userRoles = node.related("userRoles");
  const matchingRole = userRoles.find((userRole) => {
    return userRole.get("user_name") === user.get("name") &&
      userRole.get("permission") === permission;
  });

  // Update or create existing role
  if (!matchingRole) {
    let role = userRoles.find((userRole) => userRole.get("user_name") === user.get("name"));
    if (role) {
      role.set("permission", getHighestPermission([permission, role.get("permission")]));
    } else {
      role = new models.UserRole({
        user_id: user.get("id"),
        user_name: user.get("name"),
        user_title: user.get("title"),
        node_id: node.get("id"),
        node_type: nodeType,
        permission,
        event_id: node.get("event_id"),
      });
    }
    await role.save();
  }
}

/**
 * Removes a user right from a node. If the permission does not match exactly, does nothing.
 * @param  {User} user
 * @param  {Entry|Post} node
 * @param  {string} permission
 * @return {boolean}
 */
async function removeUserRight(user, node, permission) {
  await node.load("userRoles");

  const userRoles = node.related("userRoles");
  const matchingRole = userRoles.find((userRole) => {
    return userRole.get("user_name") === user.get("name") &&
        userRole.get("permission") === permission;
  });
  await matchingRole.destroy();
}
