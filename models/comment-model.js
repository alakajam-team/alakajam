'use strict'

/**
 * Comment model
 *
 * @module models/comment-model
 */

let slug = require('slug')
let db = require('../core/db')

module.exports = createModel()

function createModel () {
  let modelPrototype = db.Model.prototype

  let model = db.model('Comment', {
    tableName: 'comment',
    hasTimestamps: true,

    node: function () {
      return this.morphTo('node', ['node_type', 'node_id'], 'Entry', 'Post')
    },
    author: function () {
      return this.belongsTo('User', 'user_id', 'id')
    },
    parentComment: function () {
      return this.belongsTo('Comment', 'parent_id', 'id')
    }
  })

  model.up = async function up (applyVersion) {
    if (applyVersion === 1) {
      await db.knex.schema.createTableIfNotExists('comment', function (table) {
        table.increments('id').primary()
        table.integer('node_id')
        table.string('node_type')
        table.integer('user_id')
        table.integer('parent_id')
        table.string('body', 10000)
        table.timestamps()
      })
    }
  }

  model.down = async function down () {
    await db.knex.schema.dropTableIfExists('comment')
  }

  return model
}
