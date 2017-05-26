'use strict'

/**
 * Constants
 *
 * @module core/constants
 */

const PERMISSION_READ = 'read'
const PERMISSION_WRITE = 'write'
const PERMISSION_MANAGE = 'manage'
const ORDERED_PERMISSIONS = [PERMISSION_READ, PERMISSION_WRITE, PERMISSION_MANAGE]

module.exports = {
  // Settings
  SETTING_DB_VERSION: 'db_version',
  SETTING_SESSION_KEY: 'session_key',
  SETTING_INVITE_PASSWORD: 'invite_password',
  SETTING_INVITE_PEPPER: 'invite_pepper',

  // Security
  PERMISSION_READ,
  PERMISSION_WRITE,
  PERMISSION_MANAGE,
  ORDERED_PERMISSIONS,

  // Posts
  SPECIAL_POST_TYPE_ANNOUNCEMENT: 'announcement',

  // Dates
  DATE_FORMAT: 'MMMM Do YYYY',
  DATE_TIME_FORMAT: 'MMMM Do YYYY, h:mm',
  PICKER_DATE_TIME_FORMAT: 'YYYY-MM-DD hh:mm',
  PICKER_CLIENT_DATE_TIME_FORMAT: 'yyyy-mm-dd hh:ii'

}
