/**
 * Feedback score
 */

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.table('user', function (table) {
      table.dateTime('notifications_last_read')
    })
    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}

exports.down = async function (knex, Promise) {
  try {
    await knex.schema.table('user', function (table) {
      table.dropColumn('notifications_last_read')
    })
    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}
