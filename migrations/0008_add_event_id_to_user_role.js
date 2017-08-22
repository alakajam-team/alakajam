const config = require('../config')

/**
 * Add `event_id` field to `user_role` table.
 */
exports.up = async function (knex, Promise) {
  await knex.schema.table('user_role', function (table) {
    table.integer('event_id').references('event.id')
  })

  // The `entry` and `post` tables both have a nullable `event_id`. We'd rather
  // the entry `event_id`s were set in particular.

  // It gets a bit complicated at this point, and SQLite lacks the syntax to
  // simplify (with or without knex).
  if (config.DB_TYPE !== 'postgres') {
    return
  }

  // For each `user_role` with `node_type` `'post'`, try to grab the `event_id`
  // from the corresponding `post`.
  await knex.raw(`
    WITH result AS (
      SELECT post.event_id, user_role.id as role_id
      FROM post
      INNER JOIN user_role
      ON post.id = user_role.node_id
      WHERE user_role.node_type = 'post'
    )
    UPDATE user_role
    SET event_id = result.event_id
    FROM result
    WHERE id = result.role_id;`)

  // For each `user_role` with `node_type` `'entry'`, try to grab the
  // `event_id` from the corresponding `entry`.
  await knex.raw(`
    WITH result as (
      SELECT entry.event_id, user_role.id as role_id
      FROM entry
      INNER JOIN user_role
      ON user_role.node_id = entry.id
      WHERE user_role.node_type = 'entry'
    )
    UPDATE user_role
    SET event_id = result.event_id
    FROM result
    WHERE result.role_id = user_role.id;`)

  // Finally if any `'entry'` `user_role`s are missing an `event_id`, set it to
  // the first event.
  await knex.raw(`
    UPDATE user_role
    SET event_id = 1
    WHERE user_role.type = 'entry'
      AND user_role.event_id IS NULL`)
}

exports.down = async function (knex, Promise) {
  await knex.schema.table('user_role', function (table) {
    table.dropColumn('event_id')
  })
}
