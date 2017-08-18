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
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
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
 * | string | name | User name (must be unique)
 * | string | title |
 * | string | email |
 * | string | avatar |
 * | string | is_mod |
 * | string | is_admin |
 * | string | password |
 * | string | password_salt |
 * | dateTime | notifications_last_read |
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
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
 * | integer | user_id | User ID
 * | string | user_name | Local copy of the user name
 * | string | user_title | Local copy of the user title
 * | integer | node_id | ID of the target node
 * | string | node_type | Type of the target node ('entry' or 'post')
 * | string | permission | Permission: 'read', 'write', 'manage'
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
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
 * | string | name | Name (used in the URL). Must have a hyphen to prevent clashing other root URLs.
 * | string | title | Title
 * | string | display_dates | The event dates, for display only
 * | string | display_theme | The event theme, for display only
 * | string | status | General status: 'pending', 'open' or 'closed'
 * | string | status_rules | Event rules status: 'disabled', 'off', or a post ID
 * | string | status_theme | Theme voting status: 'disabled', 'off', 'voting', 'shortlist', 'results', or a post ID
 * | string | status_entry | Entry submission status: 'off', 'open', 'open_unranked' or 'closed'
 * | string | status_results | Event results status: 'disabled', 'off', 'voting', 'results', or a post ID
 * | string | coutdown_config | Home page countdown JSON: `{date, phrase, enabled}`
 * | date | published_at | Publication date. If empty, the event is a draft.
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
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
 * | integer | event_id | Event ID
 * | integer | category_titles | Category names (JSON: [name])
 * | integer | theme_count | Number of theme ideas submitted
 * | integer | active_theme_count | Number of active themes
 * | integer | theme_vote_count | Number of theme votes
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
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
 * | integer | event_id | Event ID
 * | string | event_name | Name (used in the URL)
 * | string | name |
 * | string | title |
 * | string | description | (max size: 2000)
 * | string | links | JSON Array : [{url, title}]
 * | string | platforms | JSON Array : [platform]
 * | string | pictures | JSON Array : [path]
 * | string | class | "solo"/"team"/"ranked"
 * | decimal | feedback_score | ([-999.999;999.999], defaults to 100)
 * | dateTime | published_at |
 * | integer | comment_count |
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
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
  platforms: function () {
    return this.hasMany('EntryPlatform', 'entry_id')
  },

  // Listeners

  initialize: function initialize (attrs) {
    modelPrototype.initialize.call(this)
    this.on('saving', function (model, attrs, options) {
      model.set('name', slug(model.get('title') || '').toLowerCase())
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
  }

}, {
  // Cascading
  dependents: ['details', 'comments', 'platforms'] // 'userRoles' removed because of issue #93
})

/**
 * Entry Details model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | entry_id | Entry ID
 * | string | body | Detailed description (max size: 10000)
 * | string | optouts | Opted-out categories (JSON: [ids])
 * | decimal | rating_1 .. 4 | Rating for categories 1 to 4 ([-99.999,99.999])
 * | integer | ranking_1 .. 4 | Ranking for categories 1 to 4 (max: 100000)
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
 */
module.exports.EntryDetails = bookshelf.model('EntryDetails', {
  tableName: 'entry_details',
  idAttribute: 'id',
  hasTimestamps: true,

  entry: function () {
    return this.belongsTo('Entry', 'entry_id')
  }
})

/**
 * Entry Platform model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | entry_id | Entry ID
 * | string | platform | Platform (max size: 50)
 */
module.exports.EntryPlatform = bookshelf.model('EntryPlatform', {
  tableName: 'entry_platform',
  idAttribute: 'id',

  entry: function () {
    return this.belongsTo('Entry', 'entry_id')
  },

  // Listeners

  initialize: function initialize (attrs) {
    modelPrototype.initialize.call(this)
    attrs = attrs || {}
    attrs.platforms = attrs.platforms || []
    return attrs
  },
  parse: function parse (attrs) {
    if (attrs.platforms) attrs.platforms = JSON.parse(attrs.platforms)
    return attrs
  },
  format: function format (attrs) {
    if (attrs && attrs.platforms) attrs.platforms = JSON.stringify(attrs.platforms)
    return attrs
  }
})

/**
 * Entry Vote model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | entry_id | Entry ID
 * | integer | event_id | Event ID
 * | integer | user_id | User ID
 * | integer | vote_1 .. 4 | Vote for categories 1 to 4 ([-999.99,999.99])
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
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

// ===============================================================
// THEMES
// ===============================================================

/**
 * Theme model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | event_id | Event ID
 * | integer | user_id | User ID
 * | string | title | (max size: 100)
 * | integer | score |
 * | integer | notes |
 * | integer | reports |
 * | string | status | 'active', 'out', 'banned', 'shortlist'
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
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
 * | integer | theme_id | Theme ID
 * | integer | event_id | Event ID
 * | integer | user_id | User ID
 * | integer | score |
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
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
 * | integer | author_user_id | Author user ID
 * | string | name | Name (used in the URL)
 * | string | title | Title
 * | integer | entry_id | Entry ID
 * | integer | event_id | Event ID
 * | string | body | Post body (max size: 10000)
 * | string | special_post_type | 'article', 'announcement' or empty
 * | integer | comment_count | Number of comments made on this post
 * | dateTime | published_at | Publication time
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
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
      if (this.get('special_post_type') !== 'article') {
        this.set('name', slug(this.get('title') || '').toLowerCase())
      }
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
 * | integer | node_id | ID of the target node
 * | string | node_type | Type of the target node ('entry' or 'post')
 * | integer | user_id | Author user ID
 * | integer | parent_id | Parent comment ID
 * | string | body | Comment body (max size: 10000)
 * | integer | feedback_score | Feedback score gained through this comment (between 1 & 3)
 * | date | created_at | Creation time
 * | date | modified_at | Last modification time
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
