/**
 * Knex DB migration configuration.
 *
 * @module knexfile
 */

import * as path from "path";
import config from "./config";
import constants from "./constants";

export default {

  directory: path.join(constants.ROOT_PATH, "server/migrations"),

  development: {
    client: config.DB_TYPE,
    connection: {
      filename: config.DB_SQLITE_FILENAME,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },

};
