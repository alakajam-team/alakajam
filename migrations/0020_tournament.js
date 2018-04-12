/**
 * Support for high scores & tournaments
 */

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.createTableIfNotExists('entry_score', function (table) {
      table.increments('id').primary()
      table.integer('user_id').references('user.id').notNullable()
      table.integer('entry_id').references('entry.id').notNullable()
      table.decimal('score', 15, 3).notNullable()
      table.string('proof')
      table.integer('ranking')
      table.boolean('active').defaultTo(true)
      table.timestamps()
    })

    await knex.schema.createTableIfNotExists('tournament_entry', function (table) {
      table.increments('id').primary()
      table.integer('event_id').references('event.id').notNullable() // NB. Usually not the same event as the entry's!
      table.integer('entry_id').references('entry.id').notNullable()
      table.integer('ordering').defaultTo(0)
      table.boolean('active').defaultTo(false)
      table.timestamps()
    })

    await knex.schema.createTableIfNotExists('tournament_score', function (table) {
      table.increments('id').primary()
      table.integer('event_id').references('event.id').notNullable()
      table.integer('user_id').references('user.id').notNullable()
      table.decimal('score', 15, 3).defaultTo(0).notNullable()
      table.string('entry_scores', 1000)
      table.integer('ranking')
      table.timestamps()
    })

    await knex.schema.table('entry', function (table) {
      table.string('status_high_score').defaultTo('off')
    })

    await knex.schema.table('entry_details', function (table) {
      table.integer('high_score_count')
      table.string('high_score_type', 20)
      table.string('high_score_instructions', 2000)
    })

    await knex.schema.table('event', function (table) {
      table.string('status_tournament').defaultTo('disabled')
    })

    Promise.resolve()
  } catch (e) {
    console.log(e.message)
    Promise.reject(e)
  }
}

exports.down = async function (knex, Promise) {
  try {
    for (let table of ['entry_score', 'tournament_entry', 'tournament_score']) {
      await knex.schema.dropTableIfExists(table)
    }

    await knex.schema.table('entry', function (table) {
      table.dropColumn('status_high_score')
    })

    await knex.schema.table('entry_details', function (table) {
      table.dropColumn('high_score_count')
      table.dropColumn('high_score_type')
      table.dropColumn('high_score_instructions')
    })

    await knex.schema.table('event', function (table) {
      table.dropColumn('status_tournament')
    })

    Promise.resolve()
  } catch (e) {
    console.log(e.message)
    Promise.reject(e)
  }
}
