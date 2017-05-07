'use strict'

/**
 * Event model
 *
 * @description ## Table columns
 *
 * @param {uuid} uuid UUID
 * @param {string} name Name, unique and used in URLs
 * @param {string} title Title, for display only
 * @param {string} display_dates The event dates, for display only
 * @param {string} display_theme The event theme, for display only
 * @param {string} status General status: 'pending', 'open' or 'closed'
 * @param {string} status_theme Theme voting status: 'on', 'off', 'disabled'
 * @param {string} status_entry Entry submission status: 'on', 'off', 'disabled'
 * @param {string} status_results Event resutls status: 'on', 'off', 'disabled'
 * @param {boolean} is_template Whether this is an actual event or just a template
 * @param {string} cron_config JSON holding data specific to the cron task
 *   in charge of running the event automatically
 * @param {date} published_at Event publication date. If empty, the event is a draft.
 * @param {date} created_at Creation time
 * @param {date} modified_at Last modification time
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
      await db.knex.schema.createTableIfNotExists('event', function (table) {
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
