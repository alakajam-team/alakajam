/**
 * Normalized scores for theme eliminations
 */

exports.up = (knex) => {
  return knex.schema.table("theme", (table) => {
    table.decimal("normalized_score", 4, 3).notNullable().defaultTo(0).index();
  });
};

exports.down = (knex) => {
  return knex.schema.table("theme", (table) => {
    table.dropColumn("normalized_score");
  });
};
