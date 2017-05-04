'use strict'

/**
 * User model
 *
 * @module models/user-model
 */

let db = require('../core/db')

module.exports = createModel()

function createModel () {
  let model = db.model('User', {
    tableName: 'user',
    idAttribute: 'uuid',
    hasTimestamps: true,
    uuid: true,
    roles: function () {
      return this.belongsTo('User', 'event_uuid')
    }
  })

  model.up = async function up (currentVersion) {
    if (currentVersion < 1) {
      await db.knex.schema.createTableIfNotExists('user', function (table) {
        table.uuid('uuid').primary()
        table.string('name')
        table.string('title')
        table.string('email')
        table.string('password')
        table.string('body', 10000)
        table.string('is_moderator')
        table.string('is_admin')
        table.dateTime('published_at')
        table.timestamps()
      })
    }
  }

  model.down = async function down () {
    await db.knex.schema.dropTableIfExists('user')
  }

  return model
}
