/**
 * Theme rough ranking, in percentage from the top
 */

if (__filename.endsWith(".js")) {

  require("module-alias/register");
}

import config from "server/core/config";
import log from "server/core/log";

exports.up = async (knex) => {
  await knex.schema.table("theme", (table) => {
    table.decimal("ranking", 4, 3);
  });

  if (config.DB_TYPE === "postgresql") {
    const themes = await knex.select().from("theme");
    for (const theme of themes) {
      log.info("Calculating ranking for theme " + theme.title + "...");
      await knex.raw("update theme set ranking = 1.0*(select count(*) from theme t1, theme t2 "
        + "where t1.normalized_score > t2.normalized_score and t2.id = " + theme.id + ")/(select count(*) from theme) "
        + "where id = " + theme.id + " and event_id = " + theme.event_id);
    }
  }
};

exports.down = async (knex) => {
  await knex.schema.table("theme", (table) => {
    table.dropColumn("ranking");
  });
};
