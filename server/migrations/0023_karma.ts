/**
 * Rename Feedback Score to Karma
 */

exports.up = async (knex) => {
  await knex.schema.table("entry", (table) => {
    table.renameColumn("feedback_score", "karma");
  });
  await knex.schema.table("comment", (table) => {
    table.renameColumn("feedback_score", "karma");
  });
};

exports.down = async (knex) => {
  await knex.schema.table("entry", (table) => {
    table.renameColumn("karma", "feedback_score");
  });
  await knex.schema.table("comment", (table) => {
    table.renameColumn("karma", "feedback_score");
  });
};
