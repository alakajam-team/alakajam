exports.up = async function(knex, Promise) {
  await knex.schema.createTableIfNotExists("tag", (table) => {
    table.increments("id").primary();
    table.string("value", 50).notNullable().index().unique();
  });

  await knex.schema.createTableIfNotExists("entry_tag", (table) => {
    table.integer("entry_id").references("entry.id").notNullable();
    table.integer("tag_id").references("tag.id").notNullable();
    table.unique(["entry_id", "tag_id"]);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTableIfExists("entry_tag");
  await knex.schema.dropTableIfExists("tag");
};
