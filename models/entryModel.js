'use strict'

let db = require('../lib/db')

/**
 * Object model
 */
let Entry = db.model('Entry', {
  tableName: 'entry',
  uuid: true,
  event: function () {
    return this.belongsTo('Event')
  }
})

/**
 * Table create
 */
Entry.up = async function () {
  await db.knex.schema.createTable('entry', function (table) {
    table.uuid('id').primary()
    table.string('title')
    table.string('screenshot')
    table.uuid('event_id').references('event.id')
  })
}

/**
 * Table drop
 */
Entry.down = async function () {
  await db.knex.schema.dropTableIfExists('entry')
}

module.exports = Entry
