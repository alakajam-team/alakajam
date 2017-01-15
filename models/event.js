'use strict'

let db = require('../lib/db')

// Object model

let Event = db.model('Event', {
  tableName: 'event',
  uuid: true,
  entries: function() {
    return this.hasMany('Entry')
  }
})

// DB table

let schema = db.knex.schema

Event.up = async function () {
  await schema.createTable('event', function (table) {
    table.uuid('id').primary()
    table.string('title')
  })
}

Event.down = async function () {
  await schema.dropTableIfExists('event')
}

module.exports = Event
