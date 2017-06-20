'use strict'

/**
 * Post model
 *
 * @module models/post-model
 */

const slug = require('slug')
const db = require('../core/db')

module.exports = createModel()

function createModel () {
  let modelPrototype = db.Model.prototype

  let model = db.model('Post', {
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

  model.up = async function up (applyVersion) {
    if (applyVersion === 1) {
      await db.knex.schema.createTableIfNotExists('post', function (table) {
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
      })
    }
  }

  model.down = async function down () {
    await db.knex.schema.dropTableIfExists('post')
  }

  return model
}
