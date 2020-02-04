/**
 * Normalized scores for theme eliminations
 */

exports.up = async (knex) => {
  return knex.schema.table("theme", (table) => {
    table.decimal("normalized_score", 4, 3).notNullable().defaultTo(0).index();
  });
};

exports.down = async (knex) => {
  return knex.schema.table("theme", (table) => {
    table.dropColumn("normalized_score");
  });
};
