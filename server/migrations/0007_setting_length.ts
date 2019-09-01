/**
 * Fix setting values being to small for the sidebar JSON
 */

if (__filename.endsWith(".js")) {
  // tslint:disable-next-line: no-var-requires
  require("module-alias/register");
}
import config from "server/core/config";

exports.up = async (knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("ALTER TABLE setting ALTER COLUMN value TYPE varchar(10000)");
  }
};

exports.down = async (knex) => {
  // Nothing
};
