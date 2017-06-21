'use strict'

/**
 * Entry model
 *
 * @module models/entry-model
 */

const db = require('../core/db')

module.exports = createModel()

function createModel () {
  let model = db.model('EntryDetails', {
    tableName: 'entry_details',
    idAttribute: 'id',
    hasTimestamps: true,

    entry: function () {
      return this.belongsTo('Entry', 'entry_id')
    }
  })

  model.up = async function up (applyVersion) {
    if (applyVersion === 1) {
      await db.knex.schema.createTableIfNotExists('entry_details', function (table) {
        table.increments('id').primary()
        table.integer('entry_id').references('entry.id').unique()
        table.string('body', 10000)
        table.timestamps()
      })
    }
  }

  model.down = async function down () {
    await db.knex.schema.dropTableIfExists('entry_details')
  }

  return model
}
