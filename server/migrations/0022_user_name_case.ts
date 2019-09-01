/**
 * Fast case-insensitive username search
 */

if (__filename.endsWith(".js")) {
  // tslint:disable-next-line: no-var-requires
  require("module-alias/register");
}
import config from "server/core/config";

exports.up = async (knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw('CREATE INDEX user_name_lowercase ON "user" (lower(name) varchar_pattern_ops)');
  }
};

exports.down = async (knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("DROP INDEX user_name_lowercase");
  }
};
