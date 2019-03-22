/**
 * Store the number of ratings the entry received
 */
const config = require("../core/config").default;

exports.up = async function(knex, Promise) {
  try {
    await knex.raw("update entry set pictures='[]' WHERE pictures is null");
    if (config.DB_TYPE === "sqlite3") {
      await knex.raw('update entry set pictures=\'{"previews": \' || pictures || \'}\'');
    } else {
      await knex.raw('update entry set pictures=CONCAT(\'{"previews": \',pictures,\'}\')');
    }

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    if (config.DB_TYPE === "sqlite3") {
      // Not really rollback but it doesn't matter on sqlite3
      await knex.raw("update entry set pictures='[]'");
    } else {
      await knex.raw('update entry set pictures=REGEXP_REPLACE(pictures, \'.*"previews":[ ]*\\[([^\\]]*)\\].*\',\'[\\1]\')');
    }
    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};
