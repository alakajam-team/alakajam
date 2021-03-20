/**
 * Support per-event special award titles
 */

import Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.table("event_details", (table) => {
    table.string("special_award_titles", 200);
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.table("event_details", (table) => {
    table.dropColumn("special_award_titles");
  });
};
