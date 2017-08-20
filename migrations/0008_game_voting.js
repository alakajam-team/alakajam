/**
 * Entry platforms storage
 */

// const config = require('../config')

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.table('event_details', function (table) {
      table.string('category_titles', 1000)
    })

    await knex.schema.table('entry', function (table) {
      table.dropColumn('feedback_score') // XXX Scores will be lost until recomputed by commenting
      table.dropColumn('category') // changing the column name to "class"
      table.string('class').defaultTo('solo').index()
    })
    await knex.schema.table('entry', function (table) {
      table.decimal('feedback_score', 6, 3).defaultTo(100)
    })

    await knex.schema.table('entry_details', function (table) {
      table.string('optouts')
      table.decimal('rating_1', 5, 3)
      table.decimal('rating_2', 5, 3)
      table.decimal('rating_3', 5, 3)
      table.decimal('rating_4', 5, 3)
      table.decimal('rating_5', 5, 3)
      table.integer('ranking_1', 100000).index()
      table.integer('ranking_2', 100000).index()
      table.integer('ranking_3', 100000).index()
      table.integer('ranking_4', 100000).index()
      table.integer('ranking_5', 100000).index()
      table.timestamps()
    })

    await knex.schema.createTableIfNotExists('entry_vote', function (table) {
      table.increments('id').primary()
      table.integer('entry_id').references('entry.id')
      table.integer('event_id').references('event.id')
      table.integer('user_id').references('user.id')
      table.decimal('vote_1', 5, 2)
      table.decimal('vote_2', 5, 2)
      table.decimal('vote_3', 5, 2)
      table.decimal('vote_4', 5, 2)
      table.decimal('vote_5', 5, 2)
      table.timestamps()
    })

    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}

exports.down = async function (knex, Promise) {
  try {
    await knex.schema.table('event_details', function (table) {
      table.dropColumn('category_names')
    })
    await knex.schema.table('entry', function (table) {
      table.dropColumn('is_rated')
      table.dropColumn('is_team')
    })
    await knex.schema.table('entry', function (table) {
      table.dropColumn('optouts')
      table.dropColumn('rating_1')
      table.dropColumn('rating_2')
      table.dropColumn('rating_3')
      table.dropColumn('rating_4')
      table.dropColumn('rating_5')
      table.dropColumn('ranking_1')
      table.dropColumn('ranking_2')
      table.dropColumn('ranking_3')
      table.dropColumn('ranking_4')
      table.dropColumn('ranking_5')
      table.dropColumn('created_at')
      table.dropColumn('updated_at')
    })
    await knex.schema.dropTableIfExists('entry_vote')
    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}
