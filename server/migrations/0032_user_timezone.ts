/**
 * Allows saving the user's local timezone
 */

import * as Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.table("user", (table) => {
    table.string("timezone");
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.table("user", (table) => {
    table.dropColumn("timezone");
  });
};
