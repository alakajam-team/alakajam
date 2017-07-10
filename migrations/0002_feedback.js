/**
 * Feedback score
 */

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.table('entry', function (table) {
      table.integer('feedback_score').defaultTo(100)
    })
    await knex.schema.table('comment', function (table) {
      table.integer('feedback_score').defaultTo(0)
    })
    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}

exports.down = async function (knex, Promise) {
  try {
    await knex.schema.table('entry', function (table) {
      table.dropColumn('feedback_score')
    })
    await knex.schema.table('comment', function (table) {
      table.dropColumn('feedback_score')
    })

    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}
