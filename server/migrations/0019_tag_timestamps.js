const log = require("../core/log").default;
const config = require("../core/config").default;

exports.up = async function(knex, Promise) {
  await knex.schema.alterTable("tag", function(table) {
    table.dropIndex("value");
    table.dropUnique("value");
  });
  await knex.schema.alterTable("entry_tag", function(table) {
    table.dropUnique(["entry_id", "tag_id"]);
  });
  await knex.schema.renameTable("entry_tag", "entry_tag_old");
  await knex.schema.renameTable("tag", "tag_old");

  // Create new tables (SQLite doesn't support adding default values to an existing table)

  await knex.schema.createTableIfNotExists("tag", (table) => {
    table.increments("id").primary();
    table.string("value", 50).notNullable().index().unique();
    table.timestamps(false, true); // Use a datetime and default to NOW()
    table.index(["created_at"]);
  });

  await knex.schema.createTableIfNotExists("entry_tag", (table) => {
    table.integer("entry_id").references("entry.id").notNullable();
    table.integer("tag_id").references("tag.id").notNullable();
    table.unique(["entry_id", "tag_id"]);
  });

  // Copy data

  let tags = await knex("tag_old").select("*");
  let entryTags = await knex("entry_tag_old").select("*");

  log.info("Migrating " + tags.length + " existing tags...");

  for (let tag of tags) {
    await knex("tag").insert({
      id: tag.id,
      value: tag.value,
    });
  }
  for (let entryTag of entryTags) {
    await knex("entry_tag").insert({
      entry_id: entryTag.entry_id,
      tag_id: entryTag.tag_id,
    });
  }

  if (config.DB_TYPE === "postgresql") {
    await knex.raw("select setval('tag_id_seq1', (SELECT MAX(id) FROM tag) + 1, false)");
  }

  // Delete old tables

  await knex.schema.dropTable("entry_tag_old");
  await knex.schema.dropTable("tag_old");
};

exports.down = async function(knex, Promise) {
  // Not a real rollback but at least this migration is replayable
  await knex.schema.alterTable("tag", function(table) {
    table.dropIndex("created_at");
  });
};
