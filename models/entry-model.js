'use strict'

/**
 * Entry model
 *
 * @module models/entry-model
 */

const db = require('../core/db')

const slug = require('slug')

module.exports = createModel()

function createModel () {
  let modelPrototype = db.Model.prototype

  let model = db.model('Entry', {
    tableName: 'entry',
    idAttribute: 'id',
    hasTimestamps: true,

    // Relations

    event: function () {
      return this.belongsTo('Event', 'event_id')
    },
    userRoles: function () {
      return this.morphMany('UserRole', 'node', ['node_type', 'node_id'])
    },
    comments: function () {
      return this.morphMany('Comment', 'node', ['node_type', 'node_id'])
    },

    // Cascading

    dependents: ['userRoles'],

    // Listeners

    initialize: function initialize (attrs) {
      modelPrototype.initialize.call(this)
      this.on('saving', function (model, attrs, options) {
        model.set('name', slug(model.get('title') || ''))
      })
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

  model.up = async function up (applyVersion) {
    if (applyVersion === 1) {
      await db.knex.schema.createTableIfNotExists('entry', function (table) {
        table.increments('id').primary()
        table.integer('event_id').references('event.id')
        table.string('event_name')
        table.string('links') // JSON Array : [{url, title}]
        table.string('pictures') // JSON Array : [path]
        table.string('category')
        table.string('name')
        table.string('title')
        table.string('body', 10000)
        table.string('results')
        table.string('picture') // TODO Replace with document API
        table.dateTime('published_at')
        table.integer('comment_count')
        table.timestamps()
      })
    }
  }

  model.down = async function down () {
    await db.knex.schema.dropTableIfExists('entry')
  }

  return model
}
