'use strict'

/**
 * Event model
 * 
 * @module models/event
 */

let db = require('../core/db')

/**
 * Object model
 */
let Event = db.model('Event', {
  tableName: 'event',
  uuid: true,
  entries: function () {
    return this.hasMany('Entry')
  }
})

/**
 * Table create
 */
Event.up = async function () {
  await db.knex.schema.createTable('event', function (table) {
    table.uuid('id').primary()
    table.string('title')
  })
}

/**
 * Table drop
 */
Event.down = async function () {
  await db.knex.schema.dropTableIfExists('event')
}

module.exports = Event
