/**
 * Fix the normalized ratings to allow 10
 */


import config from "server/core/config";

exports.up = async (knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("alter table theme alter column normalized_score type numeric(5,3)");
  }
};

exports.down = async (knex) => {
  if (config.DB_TYPE === "postgresql") {
    await knex.raw("alter table theme alter column normalized_score type numeric(4,3)");
  }
};