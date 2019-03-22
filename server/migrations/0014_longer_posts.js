/**
 * Makes post bodies, user details, and entry details longer.
 */

const config = require("../core/config").default;

exports.up = async function(knex, Promise) {
  try {
    if (config.DB_TYPE === "postgresql") {
      await knex.raw("alter table post alter column body type varchar(100000)");
      await knex.raw("alter table user_details alter column body type varchar(100000)");
      await knex.raw("alter table entry_details alter column body type varchar(100000)");
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
      await knex.raw("alter table post alter column body type varchar(10000)");
      await knex.raw("alter table user_details alter column body type varchar(10000)");
      await knex.raw("alter table entry_details alter column body type varchar(10000)");
    }
    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};
