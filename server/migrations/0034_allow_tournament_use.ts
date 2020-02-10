/**
 * Let the authors allow using their game for tournaments
 */

exports.up = async (knex) => {
  await knex.schema.table("entry_details", (table) => {
    table.boolean("allow_tournament_use");
  });
};

exports.down = async (knex) => {
  await knex.schema.table("entry_details", (table) => {
    table.dropColumn("allow_tournament_use");
  });
};
