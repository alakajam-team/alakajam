/**
 * Support for event banners & featured links
 */

exports.up = async (knex) => {
  await knex.schema.table("event", (table) => {
    table.string("logo");
  });

  await knex.schema.table("event_details", (table) => {
    table.string("banner");
    table.string("links", 2000).defaultTo("[]");
  });
};

exports.down = async (knex) => {
  await knex.schema.table("event", (table) => {
    table.dropColumn("logo");
  });

  await knex.schema.table("event_details", (table) => {
    table.dropColumn("banner");
    table.dropColumn("links");
  });
};
