/**
 * Allows setting a background to events
 */

exports.up = async (knex) => {
  await knex.schema.table("event_details", (table) => {
    table.string("background");
  });
};

exports.down = async (knex) => {
  await knex.schema.table("event_details", (table) => {
    table.dropColumn("background");
  });
};
