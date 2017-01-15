let db = require('./db.js')

module.exports.dropCreate = dropCreate

async function dropCreate () {
  let schema = db.knex.schema

  await schema.dropTableIfExists('entry')
  await schema.createTable('entry', function (table) {
    table.string('id').primary()
    table.string('title')
  })
}
