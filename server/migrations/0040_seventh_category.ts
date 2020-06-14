/**
 * Add support for a 7th rating category
 */

import * as Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.table("entry_details", (table) => {
    table.decimal("rating_7", 5, 3);
    table.integer("ranking_7").index();
  });

  await knex.schema.table("entry_vote", (table) => {
    table.decimal("vote_7", 5, 2);
  });

};

exports.down = async (knex: Knex) => {
  await knex.schema.table("entry_details", (table) => {
    table.dropColumn("rating_7");
    table.dropColumn("ranking_7");
  });

  await knex.schema.table("entry_vote", (table) => {
    table.dropColumn("vote_7");
  });
};
