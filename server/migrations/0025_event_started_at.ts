/**
 * Rename Feedback Score to Karma
 */

exports.up = async (knex) => {
  await knex.schema.table("event", (table) => {
    table.renameColumn("published_at", "started_at");
  });
};

exports.down = async (knex) => {
  await knex.schema.table("event", (table) => {
    table.renameColumn("started_at", "published_at");
  });
};
