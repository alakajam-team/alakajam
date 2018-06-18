/**
 * Rename Feedback Score to Karma
 */

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.table('entry', function (table) {
      table.renameColumn('feedback_score', 'karma')
    })
    await knex.schema.table('comment', function (table) {
      table.renameColumn('feedback_score', 'karma')
    })

    Promise.resolve()
  } catch (e) {
    console.log(e.message)
    Promise.reject(e)
  }
}

exports.down = async function (knex, Promise) {
  try {
    await knex.schema.table('entry', function (table) {
      table.renameColumn('karma', 'feedback_score')
    })
    await knex.schema.table('comment', function (table) {
      table.renameColumn('karma', 'feedback_score')
    })

    Promise.resolve()
  } catch (e) {
    console.log(e.message)
    Promise.reject(e)
  }
}
