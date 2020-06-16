/**
 * Fix the normalized ratings to allow 10
 */

if (__filename.endsWith(".js")) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("module-alias/register");
}
import config from "server/core/config";

exports.up = async (knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("alter table theme alter column normalized_score type numeric(5,3)");
  }
};

exports.down = async (knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("alter table theme alter column normalized_score type numeric(4,3)");
  }
};
