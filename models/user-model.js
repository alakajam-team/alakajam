'use strict'

/**
 * User model
 *
 * @module models/user-model
 */

const db = require('../core/db')

module.exports = createModel()

function createModel () {
  let model = db.model('User', {
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

  model.up = async function up (applyVersion) {
    if (applyVersion === 1) {
      await db.knex.schema.createTableIfNotExists('user', function (table) {
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
      })
    }
  }

  model.down = async function down () {
    await db.knex.schema.dropTableIfExists('user')
  }

  return model
}
