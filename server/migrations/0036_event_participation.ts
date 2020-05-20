/**
 * Event participation table
 */

exports.up = async (knex) => {
  await knex.schema.createTable("event_participation", (table) => {
    table.increments("id").primary();
    table.integer("event_id").references("event.id").notNullable();
    table.integer("user_id").references("user.id").notNullable();
  });

  await knex.schema.table("event_details", (table) => {
    table.integer("participation_count").defaultTo(0).notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("event_participation");

  await knex.schema.table("event_details", (table) => {
    table.dropColumn("participation_count");
  });
};
