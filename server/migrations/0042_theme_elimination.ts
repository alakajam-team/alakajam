/**
 * Make theme elimination system more flexible
 */

import Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.table("event_details", (table) => {
    table.string("theme_page_header", 200);
  });

  await knex("event_details").update("shortlist_elimination", "{}");
};

exports.down = async (knex: Knex) => {
  await knex.schema.table("event_details", (table) => {
    table.dropColumn("theme_page_header");
  });
};
