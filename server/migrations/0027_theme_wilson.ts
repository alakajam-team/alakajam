/**
 * Add columns to use a Wilson equation for the theme eliminations/shortlist selection.
 *
 */

if (__filename.endsWith(".js")) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("module-alias/register");
}
import config from "server/core/config";

exports.up = (knex) => {
  return knex.schema.table("theme", (table) => {
    table.decimal("rating_elimination", 4, 3).notNullable().defaultTo(1).index();
    table.decimal("rating_shortlist", 4, 3).notNullable().defaultTo(0).index();
  });
};

exports.down = (knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("alter table event alter column countdown_config type varchar(255)");
  }
  await knex.schema.table("theme", (table) => {
    table.dropColumn("rating_elimination");
    table.dropColumn("rating_shortlist");
  });
};
