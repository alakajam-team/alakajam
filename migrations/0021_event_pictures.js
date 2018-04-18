/**
 * Support for event banners & featured links
 */

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.table('event', function (table) {
      table.string('logo')
    })

    await knex.schema.table('event_details', function (table) {
      table.string('banner')
      table.string('links', 2000).defaultTo('[]')
    })

    Promise.resolve()
  } catch (e) {
    console.log(e.message)
    Promise.reject(e)
  }
}

exports.down = async function (knex, Promise) {
  try {
    await knex.schema.table('event', function (table) {
      table.dropColumn('logo')
    })

    await knex.schema.table('event_details', function (table) {
      table.dropColumn('banner')
      table.dropColumn('links')
    })

    Promise.resolve()
  } catch (e) {
    console.log(e.message)
    Promise.reject(e)
  }
}
