/**
 * Store the number of ratings the entry received
 */

exports.up = async function(knex, Promise) {
  try {
    await knex.schema.table("entry_details", function(table) {
      table.integer("rating_count").defaultTo(0).index();
    });

    await knex.raw("update entry_details set rating_count = " +
      "(select count(*) from entry_vote where entry_details.entry_id = entry_vote.entry_id)");

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    await knex.schema.table("entry_details", function(table) {
      table.dropColumn("rating_count");
    });

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};
