/**
 * Per-event moderator roles.
 * Seeded with the mods who authored an announcement of the event.
 */

import Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.createTable("event_role", (table) => {
    table.increments("id").primary();
    table.integer("user_id").notNullable().references("user.id").onDelete("CASCADE");
    table.integer("event_id").notNullable().references("event.id").onDelete("CASCADE");
    table.string("permission").notNullable();
    table.timestamps();
    table.unique(["user_id", "event_id"]);
  });

  const now = new Date();
  const rows = await knex("post")
    .distinct("post.author_user_id as user_id", "post.event_id")
    .join("user", "user.id", "post.author_user_id")
    .where({ "post.special_post_type": "announcement", "user.is_mod": "true" })
    .whereNotNull("post.event_id");
  await knex.batchInsert("event_role", rows.map(row => ({ ...row, permission: "manage", created_at: now, updated_at: now })), 100);
};

exports.down = async (knex: Knex) => {
  await knex.schema.dropTable("event_role");
};
