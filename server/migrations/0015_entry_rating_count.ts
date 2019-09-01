/**
 * Store the number of ratings the entry received
 */

exports.up = async (knex) => {
  await knex.schema.table("entry_details", (table) => {
    table.integer("rating_count").defaultTo(0).index();
  });

  await knex.raw("update entry_details set rating_count = " +
    "(select count(*) from entry_vote where entry_details.entry_id = entry_vote.entry_id)");
};

exports.down = async (knex) => {
  await knex.schema.table("entry_details", (table) => {
    table.dropColumn("rating_count");
  });
};
