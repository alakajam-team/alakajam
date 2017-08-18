/**
 * Entry platforms storage
 */

// const config = require('../config')

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.table('event_details', function (table) {
      table.string('category_names', 1000)
    })

    await knex.schema.table('entry', function (table) {
      table.dropColumn('feedback_score') // XXX Scores will be lost until recomputed by commenting
      table.decimal('feedback_score', 6, 3).defaultTo(100)
      table.dropColumn('category') // changing the column name to "class"
      table.string('class').defaultTo('solo').index()
      table.boolean('is_rated').index()
      table.boolean('is_team').index()
    })

    await knex.schema.table('entry_details', function (table) {
      table.string('optouts')
      table.decimal('rating_1', 5, 3)
      table.decimal('rating_2', 5, 3)
      table.decimal('rating_3', 5, 3)
      table.decimal('rating_4', 5, 3)
      table.integer('ranking_1').index()
      table.integer('ranking_2').index()
      table.integer('ranking_3').index()
      table.integer('ranking_4').index()
    })

    await knex.schema.createTableIfNotExists('entry_vote', function (table) {
      table.increments('id').primary()
      table.integer('entry_id').references('entry.id')
      table.integer('vote_1')
      table.integer('vote_2')
      table.integer('vote_3')
      table.integer('vote_4')
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
      table.dropColumn('ranking_1')
      table.dropColumn('ranking_2')
      table.dropColumn('ranking_3')
      table.dropColumn('ranking_4')
    })
    await knex.schema.dropTableIfExists('entry_vote')
    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}
