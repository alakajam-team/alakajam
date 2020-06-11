/**
 * Add support for joining events as streamers
 */

import * as Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.table("event_participation", (table) => {
    table.string("streamer_status").index().defaultTo("off");
    table.string("streamer_description", 2000);
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.table("event_participation", (table) => {
    table.dropColumn("streamer_status");
    table.dropColumn("streamer_description");
  });
};
