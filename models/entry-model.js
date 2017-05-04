'use strict'

/**
 * Entry model
 *
 * @module models/entry-model
 */

let db = require('../core/db')

module.exports = createModel()

function createModel () {
  let model = db.model('Entry', {
    tableName: 'entry',
    idAttribute: 'uuid',
    hasTimestamps: true,
    uuid: true,
    event: function () {
      return this.belongsTo('Event', 'event_uuid')
    }
  })

  model.up = async function up (currentVersion) {
    if (currentVersion < 1) {
      await db.knex.schema.createTable('entry', function (table) {
        table.uuid('uuid').primary()
        table.uuid('event_uuid').references('event.uuid')
        table.uuid('event_name')
        table.uuid('team_uuid') // .references('team.uuid')
        table.string('team_title')
        table.string('name')
        table.string('title')
        table.string('body')
        table.string('results')
        table.string('picture')
        table.dateTime('published_at')
        table.timestamps()
      })
    }
  }

  model.down = async function down () {
    await db.knex.schema.dropTableIfExists('entry')
  }

  return model
}
