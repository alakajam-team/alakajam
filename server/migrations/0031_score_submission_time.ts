/**
 * Distinguishes score submission time from other timestamps
 */

import * as Knex from "knex";
import config from "server/core/config";

exports.up = async (knex: Knex) => {
  await knex.schema.table("entry_score", (table) => {
    if (config.DB_TYPE === "postgresql") {
      table.timestamp("submitted_at").defaultTo(knex.fn.now()).notNullable().index();
    } else {
      table.timestamp("submitted_at").index();
    }
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
