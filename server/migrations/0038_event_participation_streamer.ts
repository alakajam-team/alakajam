/**
 * Add support for joining events as streamers
 */

import * as Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.table("event_participation", (table) => {
    table.boolean("is_streamer");
    table.string("streamer_description", 2000);
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.table("event_participation", (table) => {
    table.dropColumn("is_streamer");
    table.dropColumn("streamer_description");
  });
};
