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

const SPECIAL_POST_TYPE_ANNOUNCEMENT = 'announcement'
const SPECIAL_POST_TYPE_ARTICLE = 'article'
const SPECIAL_POST_TYPES = [SPECIAL_POST_TYPE_ANNOUNCEMENT, SPECIAL_POST_TYPE_ARTICLE]

const SETTING_FEATURED_EVENT_NAME = 'featured_event_name'
const SETTING_FEATURED_POST_ID = 'featured_post_id'
const SETTING_ARTICLE_SIDEBAR = 'article_sidebar'
const SETTING_SESSION_KEY = 'session_key'
const SETTING_INVITE_PASSWORD = 'invite_password'
const SETTING_INVITE_PEPPER = 'invite_pepper'

const THEME_STATUS_OUT = 'out'
const THEME_STATUS_ACTIVE = 'active'
const THEME_STATUS_BANNED = 'banned'
const THEME_STATUS_SHORTLIST = 'shortlist'
const THEME_STATUS_DUPLICATE = 'duplicate'

module.exports = {
  // Settings
  SETTING_FEATURED_EVENT_NAME,
  SETTING_FEATURED_POST_ID,
  SETTING_ARTICLE_SIDEBAR,
  SETTING_SESSION_KEY,
  SETTING_INVITE_PASSWORD,
  SETTING_INVITE_PEPPER,
  EDITABLE_SETTINGS: [SETTING_FEATURED_EVENT_NAME, SETTING_FEATURED_POST_ID, SETTING_ARTICLE_SIDEBAR],
  JSON_EDIT_SETTINGS: [SETTING_ARTICLE_SIDEBAR],

  // Security
  PERMISSION_READ,
  PERMISSION_WRITE,
  PERMISSION_MANAGE,
  ORDERED_PERMISSIONS,

  // Themes
  THEME_STATUS_OUT,
  THEME_STATUS_ACTIVE,
  THEME_STATUS_BANNED,
  THEME_STATUS_SHORTLIST,
  THEME_STATUS_DUPLICATE,
  THEME_STATUS_LIST: [THEME_STATUS_OUT, THEME_STATUS_ACTIVE, THEME_STATUS_BANNED,
    THEME_STATUS_SHORTLIST, THEME_STATUS_DUPLICATE],

  // Posts
  SPECIAL_POST_TYPE_ANNOUNCEMENT,
  SPECIAL_POST_TYPE_ARTICLE,
  SPECIAL_POST_TYPES,
  REQUIRED_ARTICLES: ['help'],
  ALLOWED_POST_TAGS: ['b', 'i', 'em', 'strong', 'a', 'u', 'br', 'iframe', 'img'],
  ALLOWED_POST_ATTRIBUTES: {
    'a': ['href'],
    'iframe': ['src', 'width', 'height', 'frameborder', 'webkitallowfullscreen', 'mozallowfullscreen', 'allowfullscreen'],
    'img': ['src', 'width', 'height']
  },
  ALLOWED_IFRAME_HOSTS: ['player.vimeo.com', 'www.youtube.com'],

  // Dates
  DATE_FORMAT: 'MMMM Do YYYY',
  DATE_TIME_FORMAT: 'MMMM Do YYYY, h:mm',
  PICKER_DATE_TIME_FORMAT: 'YYYY-MM-DD HH:mm',
  PICKER_CLIENT_DATE_TIME_FORMAT: 'yyyy-mm-dd hh:ii',

  // Misc
  ALLOWED_PICTURE_MIMETYPES: [
    'image/png',
    'image/jpeg',
    'image/gif'
  ],

  // Entries
  ENTRIES_LINKS_TYPES: ['Windows', 'Linux', 'Mac', 'Web', 'Sources', 'Soundtrack'],
  ENTRIES_LINKS_ICONS: ['fa-windows', 'fa-linux', 'fa-apple', 'fa-chrome', 'fa-bitbucket', 'fa-volume-up']

}
