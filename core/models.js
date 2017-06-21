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
  table.string('key').primary()
  table.string('value')
  table.timestamps()
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
  table.increments('id').primary()
  table.string('name').unique()
  table.string('title')
  table.string('email')
  table.string('avatar')
  table.string('is_mod')
  table.string('is_admin')
  table.string('password')
  table.string('password_salt')
  table.timestamps()
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
})

/**
  table.increments('id').primary()
  table.integer('user_id').references('user.id').unique()
  table.string('body', 10000)
  table.string('social_links', 1000)
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
    if (attrs['social_links']) attrs['social_links'] = JSON.stringify(attrs['social_links'])
    return attrs
  }
})

/**
  table.increments('id').primary()
  table.integer('user_id').references('user.id')
  table.string('user_name')
  table.string('user_title')
  table.integer('node_id')
  table.string('node_type')
  table.string('permission') // allowed: owner
  table.timestamps()
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
 * @description ## Table columns
 *
 * @param {integer} id ID
 * @param {string}  name             Unique name used in URLs. Must have a hypen to prevent clashing other root URLs.
 * @param {string}  title
 * @param {string}  display_dates    The event dates, for display only
 * @param {string}  display_theme    The event theme, for display only
 * @param {string}  status           General status: 'pending', 'open' or 'closed'
 * @param {string}  status_theme     Theme voting status: 'on', 'off', 'disabled', or a post ID
 * @param {string}  status_entry     Entry submission status: 'on', 'off', 'disabled'
 * @param {string}  status_results   Event results status: 'on', 'off', 'disabled', or a post ID
 * @param {string}  coutdown_config  Home page countdown info: {date, phrase}
 * @param {date}    published_at     Event publication date. If empty, the event is a draft.
 * @param {date}    created_at       Creation time
 * @param {date}    modified_at      Last modification time
 */
module.exports.Event = bookshelf.model('Event', {
  tableName: 'event',
  idAttribute: 'id',
  hasTimestamps: true,

  // Relations

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
    if (attrs['countdown_config']) attrs['countdown_config'] = JSON.stringify(attrs['countdown_config'])
    if (attrs['cron_config']) attrs['cron_config'] = JSON.stringify(attrs['cron_config'])
    return attrs
  }
})

/*
  table.increments('id').primary()
  table.integer('event_id').references('event.id')
  table.string('event_name')
  table.string('name')
  table.string('title')
  table.string('description', 2000)
  table.string('links') // JSON Array : [{url, title}]
  table.string('pictures') // JSON Array : [path]
  table.string('category') // "solo"/"team"
  table.dateTime('published_at')
  table.integer('comment_count')
  table.timestamps()
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

  // Cascading

  dependents: ['userRoles'],

  // Listeners

  initialize: function initialize (attrs) {
    modelPrototype.initialize.call(this)
    this.on('saving', function (model, attrs, options) {
      model.set('name', slug(model.get('title') || ''))
    })
    attrs = attrs || {}
    attrs.links = attrs.links || []
    attrs.pictures = attrs.pictures || []
    return attrs
  },
  parse: function parse (attrs) {
    if (attrs.links) attrs.links = JSON.parse(attrs.links)
    if (attrs.pictures) attrs.pictures = JSON.parse(attrs.pictures)
    return attrs
  },
  format: function format (attrs) {
    if (attrs.links) attrs.links = JSON.stringify(attrs.links)
    if (attrs.pictures) attrs.pictures = JSON.stringify(attrs.pictures)
    return attrs
  }
})

/*
  table.increments('id').primary()
  table.integer('entry_id').references('entry.id').unique()
  table.string('body', 10000)
 */
module.exports.EntryDetails = bookshelf.model('EntryDetails', {
  tableName: 'entry_details',
  idAttribute: 'id',

  entry: function () {
    return this.belongsTo('Entry', 'entry_id')
  }
})

// ===============================================================
// POSTS
// ===============================================================

/*
  table.increments('id').primary()
  table.integer('author_user_id').references('user.id')
  table.string('name')
  table.string('title')
  table.integer('entry_id').references('entry.id')
  table.integer('event_id').references('event.id')
  table.string('body', 10000)
  table.date('published_at').index()
  table.string('special_post_type')
  table.integer('comment_count')
  table.timestamps()
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
      this.set('name', slug(this.get('title') || ''))
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
})

/*
  table.increments('id').primary()
  table.integer('node_id')
  table.string('node_type')
  table.integer('user_id').references('user.id')
  table.integer('parent_id').references('comment.id')
  table.string('body', 10000)
  table.timestamps()
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
