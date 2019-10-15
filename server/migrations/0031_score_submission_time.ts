/**
 * Distinguishes score submission time from other timestamps
 */

import * as Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.table("entry_score", (table) => {
    table.timestamp("submitted_at").defaultTo(knex.fn.now()).notNullable().index();
  });

  await knex("entry_score").update({
    submitted_at: knex.raw("updated_at")
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.table("entry_score", (table) => {
    table.dropColumn("submitted_at");
  });
};
