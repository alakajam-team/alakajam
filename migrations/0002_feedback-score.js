/**
 * Feedback score
 *
 * NOTE: "notNullable" constraints were only introduced with migration 0009
 * and have been backported for better SQLite support.
 */

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.table('entry', function (table) {
      table.integer('feedback_score').defaultTo(100).notNullable()
    })
    await knex.schema.table('comment', function (table) {
      table.integer('feedback_score').defaultTo(0).notNullable()
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
