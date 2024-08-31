import Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.createTable("user_marketing", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("user.id").unique();
    table.integer("setting").defaultTo(0).index();
    table.dateTime("last_notified_at").index();
    table.timestamps();
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.dropTable("user_marketing");
};
