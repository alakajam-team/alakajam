/**
 * Store the number of ratings the entry received
 */

if (__filename.endsWith(".js")) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("module-alias/register");
}

import config from "server/core/config";

exports.up = async (knex) => {
  await knex.raw("update entry set pictures='[]' WHERE pictures is null");
  if (config.DB_TYPE === "sqlite3") {
    await knex.raw('update entry set pictures=\'{"previews": \' || pictures || \'}\'');
  } else {
    await knex.raw('update entry set pictures=CONCAT(\'{"previews": \',pictures,\'}\')');
  }
};

exports.down = async (knex) => {
  if (config.DB_TYPE === "sqlite3") {
    // Not really rollback but it doesn't matter on sqlite3
    await knex.raw("update entry set pictures='[]'");
  } else {
    await knex.raw("update entry set pictures=REGEXP_REPLACE("
      + 'pictures, \'.*"previews":[ ]*\\[([^\\]]*)\\].*\',\'[\\1]\')');
  }
};
