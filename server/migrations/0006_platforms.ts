/**
 * Entry platforms storage
 *
 * NOTE: "notNullable" constraints were only introduced with migration 0009
 * and have been backported for better SQLite support.
 */

exports.up = async (knex) => {
  await knex.schema.table("entry", (table) => {
    table.string("platforms", 1000);
  });
  await knex.schema.createTable("entry_platform", (table) => {
    table.increments("id").primary();
    table.integer("entry_id").references("entry.id").notNullable();
    table.string("platform", 50).index();
  });
};

exports.down = async (knex) => {
  await knex.schema.table("entry", (table) => {
    table.dropColumn("platforms");
  });
  await knex.schema.dropTableIfExists("entry_platform");
};
