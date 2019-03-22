/**
 * Normalized scores for theme eliminations
 */

exports.up = async function(knex, Promise) {
  try {
    await knex.schema.table("theme", function(table) {
      table.decimal("normalized_score", 4, 3).notNullable().defaultTo(0).index();
    });

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    await knex.schema.table("theme", function(table) {
      table.dropColumn("normalized_score");
    });

    Promise.resolve();
  } catch (e) {
    Promise.reject(e);
  }
};
