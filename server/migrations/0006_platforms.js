/**
 * Entry platforms storage
 *
 * NOTE: "notNullable" constraints were only introduced with migration 0009
 * and have been backported for better SQLite support.
 */

exports.up = async function(knex, Promise) {
  try {
    await knex.schema.table("entry", function(table) {
      table.string("platforms", 1000);
    });
    await knex.schema.createTable("entry_platform", function(table) {
      table.increments("id").primary();
      table.integer("entry_id").references("entry.id").notNullable();
      table.string("platform", 50).index();
    });
    Promise.resolve();
  } catch (e) {
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    await knex.schema.table("entry", function(table) {
      table.dropColumn("platforms");
    });
    await knex.schema.dropTableIfExists("entry_platform");
    Promise.resolve();
  } catch (e) {
    Promise.reject(e);
  }
};
