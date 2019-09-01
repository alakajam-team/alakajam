/**
 * Event divisions map & entry counters
 */

exports.up = async (knex) => {
  await knex.schema.table("event_details", (table) => {
    table.string("shortlist_elimination", 2000).defaultTo("{}");
  });
};

exports.down = async (knex) => {
  await knex.schema.table("event_details", (table) => {
    table.dropColumn("shortlist_elimination");
  });
};
