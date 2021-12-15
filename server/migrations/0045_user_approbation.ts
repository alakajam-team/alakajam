/**
 * Support user approbation step
 */

import Knex from "knex";

exports.up = async (knex: Knex) => {
  await knex.schema.table("user", (table) => {
    table.integer("approbation_state").index();
  });

  // Make all pre-existing users approved
  await knex("user").update({
    approbation_state: 1
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.table("user", (table) => {
    table.dropColumn("approbation_state");
  });
};
