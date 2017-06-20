'use strict'

/**
 * Event model
 *
 * @description ## Table columns
 *
 * @param {id} id ID
 * @param {string} name Name, unique and used in URLs
 * @param {string} title Title, for display only
 * @param {string} display_dates The event dates, for display only
 * @param {string} display_theme The event theme, for display only
 * @param {string} status General status: 'pending', 'open' or 'closed'
 * @param {string} status_theme Theme voting status: 'on', 'off', 'disabled'
 * @param {string} status_entry Entry submission status: 'on', 'off', 'disabled'
 * @param {string} status_results Event results status: 'on', 'off', 'disabled'
 * @param {boolean} is_template Whether this is an actual event or just a template
 * @param {string} cron_config JSON holding data specific to the cron task
 *   in charge of running the event automatically
 * @param {date} published_at Event publication date. If empty, the event is a draft.
 * @param {date} created_at Creation time
 * @param {date} modified_at Last modification time
 *
 * @module models/event-model
 */

const db = require('../core/db')

module.exports = createModel()

function createModel () {
  let modelPrototype = db.Model.prototype

  let model = db.model('Event', {
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

  model.up = async function up (applyVersion) {
    if (applyVersion === 1) {
      await db.knex.schema.createTableIfNotExists('event', function (table) {
        table.increments('id').primary()
        table.string('name').unique()
        table.string('title')
        table.string('display_dates')
        table.string('display_theme')
        table.string('status').index()
        table.string('status_theme')
        table.string('status_entry')
        table.string('status_results')
        table.string('countdown_config') // JSON Object : {phrase, date}
        table.string('cron_config')
        table.boolean('is_template')
        table.dateTime('published_at').index()
        table.timestamps()
      })
    }
  }

  model.down = async function down () {
    await db.knex.schema.dropTableIfExists('event')
  }

  return model
}
