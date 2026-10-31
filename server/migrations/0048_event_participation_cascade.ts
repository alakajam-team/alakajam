/**
 * Delete event participations along with their event or user
 */

import Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable("event_participation", (table) => {
    table.dropForeign(["event_id"]);
    table.dropForeign(["user_id"]);
  });
  await knex.schema.alterTable("event_participation", (table) => {
    table.foreign("event_id").references("event.id").onDelete("CASCADE");
    table.foreign("user_id").references("user.id").onDelete("CASCADE");
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable("event_participation", (table) => {
    table.dropForeign(["event_id"]);
    table.dropForeign(["user_id"]);
  });
  await knex.schema.alterTable("event_participation", (table) => {
    table.foreign("event_id").references("event.id");
    table.foreign("user_id").references("user.id");
  });
};
