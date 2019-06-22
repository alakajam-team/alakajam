/**
 * Database storage configuration.
 * Requiring the module returns a [Bookshelf](http://bookshelfjs.org/) instance.
 *
 * @module core/db
 */

import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import config from "./config";
import constants from "./constants";
import * as knexfile from "./knexfile";
import log from "./log";

export default initBookshelf();

const BACKUP_PATH = config.DB_SQLITE_FILENAME ? config.DB_SQLITE_FILENAME + ".backup" : undefined;

function initBookshelf() {
  let knex = createKnexInstance();
  const bookshelf = createBookshelfInstance(knex);

  /**
   * Updates the database to the latest version
   * @return {string} the previous DB version, or "none"
   */
  bookshelf.initDatabase = async (): Promise<"none"|string> => {
    log.info("Upgrading database...");
    const previousVersion = await knex.migrate.currentVersion();
    await knex.migrate.latest((knexfile as any).development.migrations);
    const newVersion = await knex.migrate.currentVersion();

    if (previousVersion !== newVersion) {
      log.info("Upgraded database from version " + previousVersion + " to " + newVersion);
    } else {
      log.info("Database is already at version " + newVersion);
    }
    return previousVersion;
  };

  /**
   * Downgrades the database until it is emptied.
   * @return {void}
   */
  bookshelf.emptyDatabase = async () => {
    let rollbackResult;
    do {
      rollbackResult = await knex.migrate.rollback();
    } while (rollbackResult[0] !== 0);
  };

  bookshelf.backup = async () => {
    _assertSQLite();
    await promisify(fs.copyFile)(config.DB_SQLITE_FILENAME, BACKUP_PATH);
  };

  bookshelf.getBackupDate = async (): Promise<Date|false> => {
    try {
      _assertSQLite();
      if (await promisify(fs.exists)(BACKUP_PATH)) {
        const stat = await promisify(fs.stat)(BACKUP_PATH);
        return stat.mtime;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  };

  bookshelf.restore = async (sessionStore) => {
    _assertSQLite();
    await knex.destroy();
    await promisify(fs.copyFile)(BACKUP_PATH, config.DB_SQLITE_FILENAME);
    sessionStore.knex = bookshelf.knex = knex = createKnexInstance();
  };

  bookshelf.deleteBackup = async () => {
    _assertSQLite();
    if (await promisify(fs.exists)(BACKUP_PATH)) {
      await promisify(fs.unlink)(BACKUP_PATH);
    }
  };

  function _assertSQLite() {
    if (config.DB_TYPE !== "sqlite3") {
      throw new Error("Interactive backups are only supported for SQLite");
    }
  }

  return bookshelf;
}

/*
 * Knex (SQL builder) init
 * @return {Knex}
 */
function createKnexInstance() {
  const knexOptions: any = {
    client: config.DB_TYPE,
    useNullAsDefault: true,
  };

  if (config.DB_TYPE === "sqlite3") {
    knexOptions.connection = {
      filename: path.resolve(constants.ROOT_PATH, config.DB_SQLITE_FILENAME)
    };
  } else {
    knexOptions.connection = {
      host: config.DB_HOST,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      charset: "utf8",
    };
  }

  const knex = require("knex")(knexOptions);

  const traceSqlThreshold = config.DEBUG_TRACE_SQL ? 0 : config.DEBUG_TRACE_SLOW_SQL;
  if (traceSqlThreshold >= 0) {
    const queryTimes = {};
    knex.on("query", (request) => {
      queryTimes[request.__knexUid] = Date.now();
    });
    knex.on("query-response", (_, request) => {
      if (queryTimes[request.__knexUid]) {
        const totalTime = Date.now() - queryTimes[request.__knexUid];
        if (totalTime >= traceSqlThreshold) {
          log.debug('"' + request.sql + '"', request.bindings, totalTime + "ms");
        }
        delete queryTimes[request.__knexUid];
      }
    });
  }

  return knex;
}

/*
 * Bookshelf (ORM) init with custom methods.
 * @param  {Knex} knex
 * @return {void}
 */
function createBookshelfInstance(knex) {
  const bookshelf = require("bookshelf")(knex);
  bookshelf.plugin("registry");
  bookshelf.plugin("pagination");
  bookshelf.plugin(require("bookshelf-cascade-delete"));
  return bookshelf;
}
