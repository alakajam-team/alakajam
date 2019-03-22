/**
 * Event divisions map & entry counters
 */

exports.up = async function(knex, Promise) {
  try {
    await knex.schema.table("event_details", function(table) {
      table.string("shortlist_elimination", 2000).defaultTo("{}");
    });

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    await knex.schema.table("event_details", function(table) {
      table.dropColumn("shortlist_elimination");
    });

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};
