/**
 * Fix missing digit in theme_page_header...
 */

import Knex from "knex";
import config from "server/core/config";

exports.up = async (knex: Knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("alter table event_details alter column theme_page_header type varchar(2000)");
  }
};

exports.down = async (knex: Knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("alter table event_details alter column theme_page_header type varchar(200)");
  }
};
