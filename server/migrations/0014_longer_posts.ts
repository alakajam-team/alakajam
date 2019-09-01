/**
 * Makes post bodies, user details, and entry details longer.
 */

if (__filename.endsWith(".js")) {
  // tslint:disable-next-line: no-var-requires
  require("module-alias/register");
}
import config from "server/core/config";

exports.up = async (knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("alter table post alter column body type varchar(100000)");
    await knex.raw("alter table user_details alter column body type varchar(100000)");
    await knex.raw("alter table entry_details alter column body type varchar(100000)");
  }
};

exports.down = async (knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("alter table post alter column body type varchar(10000)");
    await knex.raw("alter table user_details alter column body type varchar(10000)");
    await knex.raw("alter table entry_details alter column body type varchar(10000)");
  }
};
