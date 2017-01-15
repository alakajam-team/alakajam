'use strict'

let db = require('../lib/db')

// Object model

let Entry = db.model('Entry', {
  tableName: 'entry',
  uuid: true,
  event: function () {
    return this.belongsTo('Event')
  }
})

// DB table

let schema = db.knex.schema

Entry.up = async function () {
  await schema.createTable('entry', function (table) {
    table.uuid('id').primary()
    table.string('title')
    table.string('screenshot')
    table.uuid('event_id').references('event.id')
  })
}

Entry.down = async function () {
  await schema.dropTableIfExists('entry')
}

module.exports = Entry
