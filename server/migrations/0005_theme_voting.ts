/**
 * Theme voting tables
 *
 * NOTE: "notNullable" constraints were only introduced with migration 0009
 * and have been backported for better SQLite support.
 */

exports.up = async (knex) => {
  await knex.schema.createTable("theme", (table) => {
    table.increments("id").primary();
    table.integer("event_id").references("event.id").notNullable();
    table.integer("user_id").references("user.id").notNullable();
    table.string("title", 100).notNullable();
    table.string("slug", 100).index().notNullable();
    table.integer("score").defaultTo(0).index().notNullable();
    table.integer("notes").defaultTo(0).index().notNullable();
    table.integer("reports").defaultTo(0).notNullable();
    table.string("status").index().notNullable();
    table.timestamps();
  });

  await knex.schema.createTable("theme_vote", (table) => {
    table.increments("id").primary();
    table.integer("theme_id").references("theme.id").notNullable();
    table.integer("event_id").references("event.id").notNullable();
    table.integer("user_id").references("user.id").notNullable();
    table.integer("score").notNullable();
    table.timestamps();
  });

  await knex.schema.createTable("event_details", (table) => {
    table.increments("id").primary();
    table.integer("event_id").references("event.id").unique().notNullable();
    table.integer("theme_count");
    table.integer("active_theme_count");
    table.integer("theme_vote_count");
    table.timestamps();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("theme");
  await knex.schema.dropTableIfExists("theme_vote");
  await knex.schema.dropTableIfExists("event_details");
};
