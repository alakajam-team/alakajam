'use strict'

/**
 * Bookshelf models
 *
 * @module core/models
 */

const slug = require('slug')
const bookshelf = require('./db')

let modelPrototype = bookshelf.Model.prototype

// TODO Set up BaseModel to make code more concise

/**
 * Setting model
 *
 * | type | name | description
 * |--    |--    |--
 * | string | key | Primary key
 * | string | value | Setting value (max size: 10000)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
module.exports.Setting = bookshelf.model('Setting', {
  tableName: 'setting',
  idAttribute: 'key',
  hasTimestamps: true
})

// ===============================================================
// USERS
// ===============================================================

/**
 * User model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | string | name | User name (must be unique, not null)
 * | string | title |
 * | string | email | (not null)
 * | string | avatar |
 * | string | is_mod |
 * | string | is_admin |
 * | string | password | (not null)
 * | string | password_salt | (not null)
 * | dateTime | notifications_last_read |
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 * | boolean | disallow_anonymous | Disallow this user to post anonymous comments
 */
module.exports.User = bookshelf.model('User', {
  tableName: 'user',
  idAttribute: 'id',
  hasTimestamps: true,

  details: function () {
    return this.hasOne('UserDetails', 'user_id')
  },
  roles: function () {
    return this.hasMany('UserRole', 'user_id')
  },
  comments: function () {
    return this.hasMany('Comment', 'user_id')
  }
}, {
  // Cascading
  dependents: ['details', 'roles']
})

/**
 * User Details model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | user_id | User ID (must be unique)
 * | string | body | User bio (max size : 10000)
 * | string | social_links | Social links JSON `{website, twitter}` (max size : 1000)
 */
module.exports.UserDetails = bookshelf.model('UserDetails', {
  tableName: 'user_details',
  idAttribute: 'id',

  // Relations

  user: function () {
    return this.belongsTo('User', 'user_id')
  },

  // Listeners

  initialize: function initialize (attrs) {
    modelPrototype.initialize.call(this)
    attrs = attrs || {}
    attrs['social_links'] = attrs['social_links'] || []
    return attrs
  },
  parse: function parse (attrs) {
    if (attrs['social_links']) attrs['social_links'] = JSON.parse(attrs['social_links'])
    return attrs
  },
  format: function format (attrs) {
    if (attrs && attrs['social_links']) attrs['social_links'] = JSON.stringify(attrs['social_links'])
    return attrs
  }
})

/**
 * User Role model
 *
 * | type | name | description
 * |--    |--    |--
 * | integer (increments) | id | Primary key
 * | integer | user_id | User ID (not null)
 * | string | user_name | Local copy of the user name (not null)
 * | string | user_title | Local copy of the user title
 * | integer | node_id | ID of the target node (not null)
 * | string | node_type | Type of the target node ('entry' or 'post', not null)
 * | string | permission | Permission: 'read', 'write', 'manage' (not null)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
module.exports.UserRole = bookshelf.model('UserRole', {
  tableName: 'user_role',
  idAttribute: 'id',
  hasTimestamps: true,

  user: function () {
    return this.belongsTo('User', 'user_id')
  },
  node: function () {
    return this.morphTo('node', ['node_type', 'node_id'], 'Entry', 'Post')
  }
})

// ===============================================================
// EVENTS
// ===============================================================

/**
 * Event model
 *
 * | type | name | description
 * |--    |--    |--
 * | integer | id | ID
 * | string | name | Name (used in the URL, not null). Must have a hyphen to prevent clashing other root URLs.
 * | string | title | Title (not null)
 * | string | display_dates | The event dates, for display only
 * | string | display_theme | The event theme, for display only
 * | string | status | General status: 'pending', 'open' or 'closed' (not null)
 * | string | status_rules | Event rules status: 'disabled', 'off', or a post ID (not null)
 * | string | status_theme | Theme voting status: 'disabled', 'off', 'voting', 'shortlist', 'results', or a post ID (not null)
 * | string | status_entry | Entry submission status: 'off', 'open', 'open_unranked' or 'closed' (not null)
 * | string | status_results | Event results status: 'disabled', 'off', 'voting', 'results', or a post ID (not null)
 * | string | coutdown_config | Home page countdown JSON: `{date, phrase, enabled}`
 * | date | published_at | Publication date. If empty, the event is a draft.
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
module.exports.Event = bookshelf.model('Event', {
  tableName: 'event',
  idAttribute: 'id',
  hasTimestamps: true,

  // Relations

  details: function () {
    return this.hasOne('EventDetails', 'event_id')
  },
  entries: function () {
    return this.hasMany('Entry', 'event_id')
  },

  // Listeners

  initialize: function initialize (attrs) {
    modelPrototype.initialize.call(this)
    attrs = attrs || {}
    attrs['countdown_config'] = attrs.links || {}
    attrs['cron_config'] = attrs.links || {}
    return attrs
  },
  parse: function parse (attrs) {
    if (attrs['countdown_config']) attrs['countdown_config'] = JSON.parse(attrs['countdown_config'])
    if (attrs['cron_config']) attrs['cron_config'] = JSON.parse(attrs['cron_config'])
    return attrs
  },
  format: function format (attrs) {
    if (attrs && attrs['countdown_config']) attrs['countdown_config'] = JSON.stringify(attrs['countdown_config'])
    if (attrs && attrs['cron_config']) attrs['cron_config'] = JSON.stringify(attrs['cron_config'])
    return attrs
  }
}, {
  // Cascading
  dependents: ['details', 'entries']
})

/**
 * Event Details model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | event_id | Event ID (not null)
 * | integer | category_titles | Category names (JSON: [name])
 * | integer | theme_count | Number of theme ideas submitted
 * | integer | active_theme_count | Number of active themes
 * | integer | theme_vote_count | Number of theme votes
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
module.exports.EventDetails = bookshelf.model('EventDetails', {
  tableName: 'event_details',
  idAttribute: 'id',
  hasTimestamps: true,

  // Listeners

  initialize: function initialize (attrs) {
    modelPrototype.initialize.call(this)
    attrs = attrs || {}
    attrs['category_titles'] = attrs['category_titles'] || []
    return attrs
  },
  parse: function parse (attrs) {
    if (attrs['category_titles']) attrs['category_titles'] = JSON.parse(attrs['category_titles'])
    return attrs
  },
  format: function format (attrs) {
    if (attrs && attrs['category_titles']) attrs['category_titles'] = JSON.stringify(attrs['category_titles'])
    return attrs
  },

  event: function () {
    return this.belongsTo('Event', 'event_id')
  }
})

/**
 * Entry model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | event_id | Event ID (can be null in case of an external entry)
 * | string | event_name | Name (used in the URL, can be null in case of an external entry)
 * | string | external_event | External event title (if not an Alakajam! game, ie. event_id is null)
 * | string | name | (not null)
 * | string | title | (not null)
 * | string | description | (max size: 2000)
 * | string | links | JSON Array : [{url, title}]
 * | string | platforms | JSON Array : [platform]
 * | string | pictures | JSON Array : [path]
 * | string | division | "solo"/"team"/"ranked" (not null)
 * | decimal | feedback_score | ([-999.999;999.999], defaults to 100, not null)
 * | dateTime | published_at |
 * | integer | comment_count | (not null)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 * | boolean | allow_anonymous | Are anonymous comments allowed on this entry?
 */
module.exports.Entry = bookshelf.model('Entry', {
  tableName: 'entry',
  idAttribute: 'id',
  hasTimestamps: true,

  // Relations

  details: function () {
    return this.hasOne('EntryDetails', 'entry_id')
  },
  event: function () {
    return this.belongsTo('Event', 'event_id')
  },
  userRoles: function () {
    return this.morphMany('UserRole', 'node', ['node_type', 'node_id'])
  },
  comments: function () {
    return this.morphMany('Comment', 'node', ['node_type', 'node_id'])
  },
  entryPlatforms: function () {
    return this.hasMany('EntryPlatform', 'entry_id')
  },
  votes: function () {
    return this.hasMany('EntryVote', 'entry_id')
  },
  invites: function () {
    return this.hasMany('EntryInvite', 'entry_id')
  },

  // Listeners

  initialize: function initialize (attrs) {
    modelPrototype.initialize.call(this)
    this.on('saving', function (model, attrs, options) {
      model.set('name', slug(model.get('title') || '').toLowerCase() || 'unnamed')
    })
    attrs = attrs || {}
    attrs.links = attrs.links || []
    attrs.pictures = attrs.pictures || []
    attrs.platforms = attrs.platforms || []
    return attrs
  },
  parse: function parse (attrs) {
    if (attrs.links) attrs.links = JSON.parse(attrs.links)
    if (attrs.pictures) attrs.pictures = JSON.parse(attrs.pictures)
    if (attrs.platforms) attrs.platforms = JSON.parse(attrs.platforms)
    return attrs
  },
  format: function format (attrs) {
    if (attrs && attrs.links) attrs.links = JSON.stringify(attrs.links)
    if (attrs && attrs.pictures) attrs.pictures = JSON.stringify(attrs.pictures)
    if (attrs && attrs.platforms) attrs.platforms = JSON.stringify(attrs.platforms)
    return attrs
  },

  // Helpers

  sortedUserRoles: function () {
    return this.related('userRoles').sortBy(function (userRole) {
      // List owners first, otherwise sort alphabetically
      if (userRole.get('permission') === 'manage') {
        return ' ' + userRole.get('user_title')
      } else {
        return userRole.get('user_title')
      }
    })
  }

}, {
  // Cascading
  dependents: ['details', 'comments', 'entryPlatforms', 'votes', 'invites'] // 'userRoles' removed because of issue #93
})

/**
 * Entry Details model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | entry_id | Entry ID (not null)
 * | string | body | Detailed description (max size: 10000)
 * | string | optouts | Opted-out categories (JSON: [ids])
 * | decimal | rating_1 .. 4 | Rating for categories 1 to 4 ([-99.999,99.999])
 * | integer | ranking_1 .. 4 | Ranking for categories 1 to 4 (max: 100000)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
module.exports.EntryDetails = bookshelf.model('EntryDetails', {
  tableName: 'entry_details',
  idAttribute: 'id',
  hasTimestamps: true,

  entry: function () {
    return this.belongsTo('Entry', 'entry_id')
  },

  // Listeners

  initialize: function initialize (attrs) {
    modelPrototype.initialize.call(this)
    attrs = attrs || {}
    attrs.optouts = attrs.optouts || []
    return attrs
  },
  parse: function parse (attrs) {
    if (attrs.optouts) attrs.optouts = JSON.parse(attrs.optouts)
    return attrs
  },
  format: function format (attrs) {
    if (attrs && attrs.optouts) attrs.optouts = JSON.stringify(attrs.optouts)
    return attrs
  }

})

/**
 * Platform model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | string | name | Platform name
 */
module.exports.Platform = bookshelf.model('Platform', {
  tableName: 'platform',
  idAttribute: 'id'
})

/**
 * Entry Platform model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | entry_id | Entry ID (not null)
 * | string | platform_name | Platform name (max size: 50)
 */
module.exports.EntryPlatform = bookshelf.model('EntryPlatform', {
  tableName: 'entry_platform',
  idAttribute: 'id',

  entry: function () {
    return this.belongsTo('Entry', 'entry_id')
  },

  platform () {
    return this.belongsTo('Platform', 'platform_id')
  },

  // Listeners

  initialize: function initialize (attrs) {
    modelPrototype.initialize.call(this)
    attrs = attrs || {}
    return attrs
  }
})

/**
 * Entry Vote model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | entry_id | Entry ID (not null)
 * | integer | event_id | Event ID (not null)
 * | integer | user_id | User ID (not null)
 * | decimal | vote_1 .. 4 | Vote for categories 1 to 4 ([-999.99,999.99])
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
module.exports.EntryVote = bookshelf.model('EntryVote', {
  tableName: 'entry_vote',
  idAttribute: 'id',
  hasTimestamps: true,

  entry: function () {
    return this.belongsTo('Entry', 'entry_id')
  },
  event: function () {
    return this.belongsTo('Event', 'event_id')
  },
  user: function () {
    return this.belongsTo('User', 'user_id')
  }
})

/**
 * Entry Invite model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | entry_id | Target entry ID (not null)
 * | integer | invited_user_id | User ID of the person invited (not null)
 * | integer | invited_user_title | User title of the person invited (not null)
 * | string | permission | The offered permission (not null)
 */
module.exports.EntryInvite = bookshelf.model('EntryInvite', {
  tableName: 'entry_invite',
  idAttribute: 'id',
  hasTimestamps: true,

  entry: function () {
    return this.belongsTo('Entry', 'entry_id')
  },
  invited: function () {
    return this.belongsTo('User', 'invited_user_id')
  }
})

// ===============================================================
// THEMES
// ===============================================================

/**
 * Theme model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | event_id | Event ID (not null)
 * | integer | user_id | User ID (not null)
 * | string | title | (max size: 100, not null)
 * | string | slug | Used for detecting duplicate themes (not null)
 * | integer | score | (defaults to 0, not null)
 * | decimal | normalized_score | (defaults to 0, not null, [-9.999;9.999])
 * | decimal | ranking | rough ranking in percentage ([-9.999;9.999])
 * | integer | notes | (defaults to 0, not null)
 * | integer | reports | (defaults to 0, not null)
 * | string | status | 'active', 'out', 'banned', 'shortlist' (not null)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
module.exports.Theme = bookshelf.model('Theme', {
  tableName: 'theme',
  idAttribute: 'id',
  hasTimestamps: true,

  // Relations

  event: function () {
    return this.belongsTo('Event', 'event_id')
  },
  user: function () {
    return this.belongsTo('User', 'user_id')
  },
  votes: function () {
    return this.hasMany('ThemeVote', 'theme_id')
  }

}, {
  // Cascading
  dependents: ['votes']
})

/**
 * Theme Vote model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | theme_id | Theme ID (not null)
 * | integer | event_id | Event ID (not null)
 * | integer | user_id | User ID (not null)
 * | integer | score | (not null)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
module.exports.ThemeVote = bookshelf.model('ThemeVote', {
  tableName: 'theme_vote',
  idAttribute: 'id',
  hasTimestamps: true,

  // Relations

  theme: function () {
    return this.belongsTo('Theme', 'theme_id')
  },
  event: function () {
    return this.belongsTo('Event', 'event_id')
  },
  user: function () {
    return this.belongsTo('User', 'user_id')
  }

})

// ===============================================================
// POSTS
// ===============================================================

/**
 * Post model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | author_user_id | Author user ID (not null)
 * | string | name | Name (used in the URL, not null)
 * | string | title | Title (not null)
 * | integer | entry_id | Entry ID
 * | integer | event_id | Event ID
 * | string | body | Post body (max size: 10000)
 * | string | special_post_type | 'announcement' or empty
 * | integer | comment_count | Number of comments made on this post
 * | dateTime | published_at | Publication time
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
module.exports.Post = bookshelf.model('Post', {
  tableName: 'post',
  hasTimestamps: true,

  initialize: function initialize (attrs) {
    modelPrototype.initialize.call(this)
    this.on('saving', function (model, attrs, options) {
      this.trigger('titleChanged')
    })
    this.on('titleChanged', function () {
      this.set('name', slug(this.get('title') || '').toLowerCase())
    })
    return attrs
  },
  entry: function () {
    return this.belongsTo('Entry', 'entry_id')
  },
  event: function () {
    return this.belongsTo('Event', 'event_id')
  },
  author: function () {
    return this.belongsTo('User', 'author_user_id')
  },
  userRoles: function () {
    // TODO isn't it sufficient to specify either 'node' or ['node_type', 'node_id']?
    return this.morphMany('UserRole', 'node', ['node_type', 'node_id'])
  },
  comments: function () {
    return this.morphMany('Comment', 'node', ['node_type', 'node_id'])
  }
}, {
  // Cascading
  dependents: ['comments'] // 'userRoles' removed because of issue #93
})

/**
 * Comment model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | node_id | ID of the target node (not null)
 * | string | node_type | Type of the target node ('entry' or 'post', not null)
 * | integer | user_id | Author user ID (not null)
 * | integer | parent_id | Parent comment ID
 * | string | body | Comment body (max size: 10000)
 * | integer | feedback_score | Feedback score gained through this comment (between 1 & 3, not null)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
module.exports.Comment = bookshelf.model('Comment', {
  tableName: 'comment',
  hasTimestamps: true,

  node: function () {
    return this.morphTo('node', ['node_type', 'node_id'], 'Entry', 'Post')
  },
  user: function () {
    return this.belongsTo('User', 'user_id', 'id')
  },
  parentComment: function () {
    return this.belongsTo('Comment', 'parent_id', 'id')
  }
})
