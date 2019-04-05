/**
 * Knex DB migration configuration.
 *
 * @module knexfile
 */

import * as path from "path";
import config from "./config";
import constants from "./constants";

// CommonJS export for knex cli support
module.exports = {
  development: {
    client: config.DB_TYPE,
    connection: {
      filename: config.DB_SQLITE_FILENAME ? path.resolve(constants.ROOT_PATH, config.DB_SQLITE_FILENAME) : undefined,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: path.resolve(constants.ROOT_PATH, "server/migrations"),
      tableName: "knex_migrations"
    }
  }
};
