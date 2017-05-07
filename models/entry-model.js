'use strict'

/**
 * Entry model
 *
 * @module models/entry-model
 */

let db = require('../core/db')

module.exports = createModel()

function createModel () {
  let modelPrototype = db.Model.prototype

  let model = db.model('Entry', {
    tableName: 'entry',
    idAttribute: 'uuid',
    hasTimestamps: true,
    uuid: true,

    event: function () {
      return this.belongsTo('Event', 'event_uuid')
    },
    userRoles: function () {
      return this.morphMany('UserRole', 'node', ['node_type', 'node_uuid'])
    },

    initialize: function initialize (attrs) {
      modelPrototype.initialize.call(this)
      attrs = attrs || {}
      attrs.links = attrs.links || []
      attrs.pictures = attrs.pictures || []
      return attrs
    },
    parse: function parse (attrs) {
      if (attrs.links) attrs.links = JSON.parse(attrs.links)
      if (attrs.pictures) attrs.pictures = JSON.parse(attrs.pictures)
      return attrs
    },
    format: function format (attrs) {
      if (attrs.links) attrs.links = JSON.stringify(attrs.links)
      if (attrs.pictures) attrs.pictures = JSON.stringify(attrs.pictures)
      return attrs
    }
  })

  model.up = async function up (currentVersion) {
    if (currentVersion < 1) {
      await db.knex.schema.createTableIfNotExists('entry', function (table) {
        table.uuid('uuid').primary()
        table.uuid('event_uuid').references('event.uuid')
        table.uuid('event_name')
        table.uuid('team_uuid') // .references('team.uuid')
        table.string('links') // JSON Array : [{url, title}]
        table.string('pictures') // JSON Array : [path]
        table.string('category')
        table.string('team_title')
        table.string('name')
        table.string('title')
        table.string('body', 10000)
        table.string('results')
        table.string('picture') // TODO Replace with document API
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
