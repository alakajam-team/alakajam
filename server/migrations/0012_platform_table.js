exports.up = async function(knex, Promise) {
  await knex.schema.createTableIfNotExists("platform", (table) => {
    table.increments("id").primary();
    table.string("name", 32).notNullable().index().unique();
    table.timestamps(false, true); // Use a datetime and default to NOW()
  });

  // Replace platform names column with FK to platform table.
  await knex.schema.dropTable("entry_platform");
  await knex.schema.createTable("entry_platform", (table) => {
    table.integer("entry_id").references("entry.id").notNullable();
    table.integer("platform_id").references("platform.id").notNullable();
    table.string("platform_name").notNullable().index();
    table.unique(["entry_id", "platform_id"]);
    table.timestamps(false, true); // Use a datetime and default to NOW()
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.table("entry_platform", (table) => {
    table.dropColumn("platform_id");
    table.dropColumn("platform_name");
    table.string("platform", 50).index();
    table.dropTimestamps();
  });
  await knex.schema.dropTableIfExists("platform");
};
