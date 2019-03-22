/**
 * Add columns to use a Wilson equation for the theme eliminations/shortlist selection.
 *
 */

const config = require("../core/config");

exports.up = async function(knex, Promise) {
  try {
    await knex.schema.table("theme", (table) => {
      table.decimal("rating_elimination", 4, 3).notNullable().defaultTo(1).index();
      table.decimal("rating_shortlist", 4, 3).notNullable().defaultTo(0).index();
    });

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    if (config.DB_TYPE === "postgresql") {
      await knex.raw("alter table event alter column countdown_config type varchar(255)");
    }
    await knex.schema.table("theme", (table) => {
      table.dropColumn("rating_elimination");
      table.dropColumn("rating_shortlist");
    });

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};
