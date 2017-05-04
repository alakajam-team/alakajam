'use strict'

/**
 * Event model
 *
 * @param {uuid} uuid UUID
 * @param {string} name Name
 * @param {string} title Title
 *
 * @module models/event-model
 */

let db = require('../core/db')

module.exports = createModel()

function createModel () {
  let model = db.model('Event', {
    tableName: 'event',
    idAttribute: 'uuid',
    hasTimestamps: true,
    uuid: true,
    entries: function () {
      return this.hasMany('Entry', 'event_uuid')
    }
  })

  model.up = async function up (currentVersion) {
    if (currentVersion < 1) {
      await db.knex.schema.createTable('event', function (table) {
        table.uuid('uuid').primary()
        table.string('name')
        table.string('title')
        table.string('display_dates')
        table.string('display_theme')
        table.string('status')
        table.string('status_theme')
        table.string('status_entry')
        table.string('status_results')
        table.boolean('is_template')
        table.string('cron_config')
        table.dateTime('published_at')
        table.timestamps()
      })
    }
  }

  model.down = async function down () {
    await db.knex.schema.dropTableIfExists('event')
  }

  return model
}
