/**
 * Entry and post hotness
 */

if (__filename.endsWith(".js")) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("module-alias/register");
}

exports.up = async (knex) => {
  await knex.schema.table("entry", (table) => {
    table.decimal("hotness", 8, 3).index().notNullable().defaultTo(0);
  });
  await knex.schema.table("post", (table) => {
    table.decimal("hotness", 8, 3).index().notNullable().defaultTo(0);
  });
};

exports.down = async (knex) => {
  await knex.schema.table("entry", (table) => {
    table.dropColumn("hotness");
  });
  await knex.schema.table("post", (table) => {
    table.dropColumn("hotness");
  });
};
