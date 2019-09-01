/**
 * Game voting + not-null constraints
 *
 * NOTE: Entry feedback scores will be lost until recomputed by commenting
 */

if (__filename.endsWith(".js")) {
  // tslint:disable-next-line: no-var-requires
  require("module-alias/register");
}

import config from "server/core/config";
import log from "server/core/log";

exports.up = async (knex) => {
  await knex.schema.table("event_details", (table) => {
    table.string("category_titles", 1000);
  });

  await knex.schema.table("entry", (table) => {
    table.dropColumn("feedback_score");
    table.dropColumn("category"); // changing the column name to "class"
    table.string("class").notNullable().defaultTo("solo").index();
    table.string("external_event").index();
  });
  await knex.schema.table("entry", (table) => {
    // different transaction than the column removal
    table.decimal("feedback_score", 6, 3).notNullable().defaultTo(100);
  });

  await knex.schema.table("entry_details", (table) => {
    table.string("optouts");
    table.decimal("rating_1", 5, 3);
    table.decimal("rating_2", 5, 3);
    table.decimal("rating_3", 5, 3);
    table.decimal("rating_4", 5, 3);
    table.decimal("rating_5", 5, 3);
    table.decimal("rating_6", 5, 3);
    table.integer("ranking_1").index();
    table.integer("ranking_2").index();
    table.integer("ranking_3").index();
    table.integer("ranking_4").index();
    table.integer("ranking_5").index();
    table.integer("ranking_6").index();
    table.timestamps();
  });

  await knex.schema.createTable("entry_vote", (table) => {
    table.increments("id").primary();
    table.integer("entry_id").references("entry.id").notNullable();
    table.integer("event_id").references("event.id").notNullable();
    table.integer("user_id").references("user.id").notNullable();
    table.decimal("vote_1", 5, 2);
    table.decimal("vote_2", 5, 2);
    table.decimal("vote_3", 5, 2);
    table.decimal("vote_4", 5, 2);
    table.decimal("vote_5", 5, 2);
    table.decimal("vote_6", 5, 2);
    table.timestamps();
  });

  if (config.DB_TYPE === "postgresql") {
    const notNullColumns = [
      "user.name", "user.email", "user.password", "user.password_salt",
      "user_role.user_id", "user_role.user_name", "user_role.node_id", "user_role.node_type", "user_role.permission",
      "event.name", "event.title",
      "event.status", "event.status_theme", "event.status_entry", "event.status_results", "event.status_rules",
      "event_details.event_id",
      "entry.name", "entry.title", "entry.comment_count",
      "entry_details.entry_id",
      "entry_platform.entry_id",
      "theme.event_id", "theme.user_id", "theme.title", "theme.slug",
      "theme.score", "theme.notes", "theme.reports", "theme.status",
      "theme_vote.theme_id", "theme_vote.event_id", "theme_vote.user_id", "theme_vote.score",
      "post.author_user_id", "post.name", "post.title",
      "comment.node_id", "comment.node_type", "comment.user_id", "comment.feedback_score",
    ];

    for (const column of notNullColumns) {
      const columnInfo = column.split(".");
      await knex.raw('ALTER TABLE "' + columnInfo[0] + '" ALTER COLUMN ' + columnInfo[1] + " SET NOT NULL");
    }
  }
};

exports.down = async (knex) => {
  await knex.schema.table("event_details", (table) => {
    table.dropColumn("category_names");
  });
  await knex.schema.table("entry", (table) => {
    table.dropColumn("is_rated");
    table.dropColumn("is_team");
  });
  await knex.schema.table("entry", (table) => {
    table.dropColumn("optouts");
    table.dropColumn("rating_1");
    table.dropColumn("rating_2");
    table.dropColumn("rating_3");
    table.dropColumn("rating_4");
    table.dropColumn("rating_5");
    table.dropColumn("rating_6");
    table.dropColumn("ranking_1");
    table.dropColumn("ranking_2");
    table.dropColumn("ranking_3");
    table.dropColumn("ranking_4");
    table.dropColumn("ranking_5");
    table.dropColumn("ranking_6");
    table.dropColumn("created_at");
    table.dropColumn("updated_at");
  });
  await knex.schema.dropTableIfExists("entry_vote");
};
