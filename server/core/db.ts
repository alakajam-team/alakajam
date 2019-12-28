/**
 * Database storage configuration.
 * Requiring the module returns a [Bookshelf](http://bookshelfjs.org/) instance.
 *
 * @module core/db
 */

import * as Bookshelf from "bookshelf";
import * as fs from "fs-extra";
import * as Knex from "knex";
import config from "./config";
import * as knexfile from "./knexfile";
import log from "./log";

export type DB = Bookshelf & {
  initDatabase: (options?: {silent?: boolean}) => Promise<"none"|string>;
  emptyDatabase: () => Promise<void>;
  backup: () => Promise<void>;
  getBackupDate: () => Promise<Date|false>;
  restore: (sessionStore) => Promise<void>;
  deleteBackup: () => Promise<void>;

  // Bookshelf registry plugin
  model: <T>(name: string, extensions: T, ...args)
    => Bookshelf.Model<T & Bookshelf.BookshelfModel> & typeof Bookshelf.Model;
};

export default initBookshelf();

const BACKUP_PATH = config.DB_SQLITE_FILENAME ? config.DB_SQLITE_FILENAME + ".backup" : undefined;

function initBookshelf(): DB {
  let knex = createKnexInstance();

  const bookshelf = createBookshelfInstance(knex) as DB;

  /**
   * Updates the database to the latest version
   * @return {string} the previous DB version, or "none"
   */
  bookshelf.initDatabase = async (options: {silent?: boolean} = {}): Promise<"none"|string> => {
    if (!options.silent) {
      log.info("Upgrading database...");
    }

    if (!knex) {
      (bookshelf as any).knex = knex = createKnexInstance();
    }

    // Migrating the migrations table... Switch file names between TypeScript & JavaScript to please knex
    // Will possibly be made irrelevant with https://github.com/tgriesser/knex/issues/2756
    try {
      const migrationsTableName = (knexfile as any).development.migrations.tableName;
      if (__filename.endsWith(".js")) {
        await knex(migrationsTableName).update({
          name: knex.raw("REPLACE(name, '.ts', '.js')")
        });
      } else {
        await knex(migrationsTableName).update({
          name: knex.raw("REPLACE(name, '.js', '.ts')")
        });
      }
    } catch (e) {
      // NOP
    }

    const previousVersion = await knex.migrate.currentVersion();
    await knex.migrate.latest((knexfile as any).development.migrations);
    const newVersion = await knex.migrate.currentVersion();

    if (!options.silent) {
      if (previousVersion !== newVersion) {
        log.info("Upgraded database from version " + previousVersion + " to " + newVersion);
      } else {
        log.info("Database is already at version " + newVersion);
      }
    }

    return previousVersion;
  };

  /**
   * Disconnects from the database and deletes it.
   * @return {void}
   */
  bookshelf.emptyDatabase = async () => {
    if (knex) {
      await knex.destroy();
      knex = null;
    }
    if (fs.existsSync(config.DB_SQLITE_FILENAME)) {
      await fs.unlinkSync(config.DB_SQLITE_FILENAME);
    }
  };

  bookshelf.backup = async () => {
    _assertSQLite();
    await fs.copyFile(config.DB_SQLITE_FILENAME, BACKUP_PATH);
  };

  bookshelf.getBackupDate = async (): Promise<Date|false> => {
    try {
      _assertSQLite();
      if (await fs.existsSync(BACKUP_PATH)) {
        const stat = await fs.stat(BACKUP_PATH);
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
    await fs.copyFile(BACKUP_PATH, config.DB_SQLITE_FILENAME);
    sessionStore.knex = bookshelf.knex = knex = createKnexInstance() as any;
  };

  bookshelf.deleteBackup = async () => {
    _assertSQLite();
    if (await fs.pathExists(BACKUP_PATH)) {
      await fs.unlink(BACKUP_PATH);
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
function createKnexInstance(): Knex {
  const knexConfig = (knexfile as any).development;
  const knex = require("knex")(knexConfig);

  const traceSqlThreshold = config.DEBUG_TRACE_SQL ? 0 : config.DEBUG_TRACE_SLOW_SQL;
  if (traceSqlThreshold >= 0) {
    const queryTimes = {};
    knex.on("query", (request) => {
      queryTimes[request.__knexUid] = Date.now();
    });
    knex.on("query-error", (error, obj) => {
      log.error(error, obj);
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
function createBookshelfInstance(knex: Knex) {
  const bookshelf = Bookshelf(knex as any);
  bookshelf.plugin("registry");
  bookshelf.plugin("pagination");
  bookshelf.plugin(require("bookshelf-cascade-delete"));
  return bookshelf;
}
