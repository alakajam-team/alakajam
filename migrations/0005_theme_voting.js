/**
 * Theme voting tables
 */

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.createTableIfNotExists('theme', function (table) {
      table.increments('id').primary()
      table.integer('event_id').references('event.id')
      table.integer('user_id').references('user.id')
      table.string('title', 100)
      table.string('slug', 100).index()
      table.integer('score').defaultTo(0).index()
      table.integer('notes').defaultTo(0).index()
      table.integer('reports').defaultTo(0)
      table.string('status').index()
      table.timestamps()
    })

    await knex.schema.createTableIfNotExists('theme_vote', function (table) {
      table.increments('id').primary()
      table.integer('theme_id').references('theme.id')
      table.integer('event_id').references('event.id')
      table.integer('user_id').references('user.id')
      table.integer('score')
      table.timestamps()
    })

    await knex.schema.createTableIfNotExists('event_details', function (table) {
      table.increments('id').primary()
      table.integer('event_id').references('event.id').unique()
      table.integer('theme_count')
      table.integer('active_theme_count')
      table.integer('theme_vote_count')
      table.timestamps()
    })

    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}

exports.down = async function (knex, Promise) {
  try {
    await knex.schema.dropTableIfExists('theme')
    await knex.schema.dropTableIfExists('theme_vote')
    await knex.schema.dropTableIfExists('event_details')
    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}
