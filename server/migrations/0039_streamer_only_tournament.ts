/**
 * Add support for joining events as streamers
 */

import * as Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.table("event_details", (table) => {
    table.string("flags", 100000).defaultTo("{}");
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.table("event_details", (table) => {
    table.dropColumn("flags");
  });
};
