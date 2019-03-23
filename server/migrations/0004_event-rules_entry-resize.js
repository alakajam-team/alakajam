/**
 * Event rules shortcut + Bigger links/pictures fields for entries
 *
 * NOTE: "notNullable" constraints were only introduced with migration 0009
 * and have been backported for better SQLite support.
 */

require("module-alias/register");
const config = require("server/core/config").default;

exports.up = async function(knex, Promise) {
  try {
    await knex.schema.table("event", function(table) {
      table.string("status_rules").defaultTo("disabled").notNullable();
    });
    if (config.DB_TYPE === "postgresql") {
      await knex.raw("alter table entry alter column links type varchar(1000)");
      await knex.raw("alter table entry alter column pictures type varchar(1000)");
    }
    Promise.resolve();
  } catch (e) {
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    await knex.schema.table("event", function(table) {
      table.dropColumn("status_rules");
    });
    if (config.DB_TYPE === "postgresql") {
      await knex.raw("alter table entry alter column links type varchar(255)");
      await knex.raw("alter table entry alter column pictures type varchar(255)");
    }
    Promise.resolve();
  } catch (e) {
    Promise.reject(e);
  }
};
