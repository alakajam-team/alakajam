/**
 * Rename Feedback Score to Karma
 */

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.table('event', function (table) {
      table.renameColumn('published_at', 'started_at')
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
      table.renameColumn('started_at', 'published_at')
    })

    Promise.resolve()
  } catch (e) {
    console.log(e.message)
    Promise.reject(e)
  }
}
