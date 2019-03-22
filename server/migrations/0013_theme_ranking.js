/**
 * Theme rough ranking, in percentage from the top
 */

const config = require("../core/config");

exports.up = async function(knex, Promise) {
  try {
    await knex.schema.table("theme", function(table) {
      table.decimal("ranking", 4, 3);
    });

    if (config.DB_TYPE === "postgresql") {
      let themes = await knex.select().from("theme");
      for (let theme of themes) {
        console.log("Calculating ranking for theme " + theme.title + "...");
        await knex.raw("update theme set ranking = 1.0*(select count(*) from theme t1, theme t2 where t1.normalized_score > t2.normalized_score and t2.id = " + theme.id + ")/(select count(*) from theme) " +
          "where id = " + theme.id + " and event_id = " + theme.event_id);
      }
    }

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    await knex.schema.table("theme", function(table) {
      table.dropColumn("ranking");
    });

    Promise.resolve();
  } catch (e) {
    Promise.reject(e);
  }
};
