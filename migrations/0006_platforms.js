/**
 * Entry platforms storage
 */

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.table('entry', function (table) {
      table.string('platforms', 1000)
    })
    await knex.schema.createTableIfNotExists('entry_platform', function (table) {
      table.increments('id').primary()
      table.integer('entry_id').references('entry.id')
      table.string('platform', 50).index()
    })
    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}

exports.down = async function (knex, Promise) {
  try {
    await knex.schema.table('entry', function (table) {
      table.dropColumn('platforms')
    })
    await knex.schema.dropTableIfExists('entry_platform')
    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}
