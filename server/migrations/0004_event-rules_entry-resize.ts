/**
 * Event rules shortcut + Bigger links/pictures fields for entries
 *
 * NOTE: "notNullable" constraints were only introduced with migration 0009
 * and have been backported for better SQLite support.
 */

if (__filename.endsWith(".js")) {
  // tslint:disable-next-line: no-var-requires
  require("module-alias/register");
}

import config from "server/core/config";

exports.up = async (knex) => {
  await knex.schema.table("event", (table) => {
    table.string("status_rules").defaultTo("disabled").notNullable();
  });
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("alter table entry alter column links type varchar(1000)");
    await knex.raw("alter table entry alter column pictures type varchar(1000)");
  }
};

exports.down = async (knex) => {
  await knex.schema.table("event", (table) => {
    table.dropColumn("status_rules");
  });
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("alter table entry alter column links type varchar(255)");
    await knex.raw("alter table entry alter column pictures type varchar(255)");
  }
};
