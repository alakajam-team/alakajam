/**
 * Feedback score
 *
 * NOTE: "notNullable" constraints were only introduced with migration 0009
 * and have been backported for better SQLite support.
 */

exports.up = async (knex) => {
  await knex.schema.table("entry", (table) => {
    table.integer("feedback_score").defaultTo(100).notNullable();
  });
  await knex.schema.table("comment", (table) => {
    table.integer("feedback_score").defaultTo(0).notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.table("entry", (table) => {
    table.dropColumn("feedback_score");
  });
  await knex.schema.table("comment", (table) => {
    table.dropColumn("feedback_score");
  });
};
