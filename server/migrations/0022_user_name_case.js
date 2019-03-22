/**
 * Fast case-insensitive username search
 */

const config = require("../core/config");

exports.up = async function(knex, Promise) {
  try {
    if (config.DB_TYPE === "postgresql") {
      await knex.raw('CREATE INDEX user_name_lowercase ON "user" (lower(name) varchar_pattern_ops)');
    }

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    if (config.DB_TYPE === "postgresql") {
      await knex.raw("DROP INDEX user_name_lowercase");
    }

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};
