'use strict'

/**
 * User model
 *
 * @module models/user-model
 */

const db = require('../core/db')

module.exports = createModel()

function createModel () {
  let modelPrototype = db.Model.prototype

  let model = db.model('UserDetails', {
    tableName: 'user_details',
    idAttribute: 'id',
    hasTimestamps: true,

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

  model.up = async function up (applyVersion) {
    if (applyVersion === 1) {
      await db.knex.schema.createTableIfNotExists('user_details', function (table) {
        table.increments('id').primary()
        table.integer('user_id').references('user.id').unique()
        table.string('body', 10000)
        table.string('social_links', 1000)
        table.timestamps()
      })
    }
  }

  model.down = async function down () {
    await db.knex.schema.dropTableIfExists('user_details')
  }

  return model
}
