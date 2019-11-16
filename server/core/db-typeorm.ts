import * as path from "path";
import { Connection, ConnectionOptions, createConnection, getConnection } from "typeorm";
import { BaseConnectionOptions } from "typeorm/connection/BaseConnectionOptions";
import { LoggerOptions } from "typeorm/logger/LoggerOptions";
import config from "./config";
import constants from "./constants";
import dbTypeormLogger from "./db-typeorm-logger";
import log from "./log";

/**
 * Connection to a relational database (PostgreSQL or SQLite), through the TypeORM library.
 *
 * /!\ Work in progress. The goal is to progressively migrate from Bookshelf to TypeORM.
 */
export class DB {

  private readonly ENTITIES_PATH = (__filename.endsWith(".js"))
      ? path.resolve(constants.ROOT_PATH, "dist/server/entity/*.entity.js")
      : path.resolve(constants.ROOT_PATH, "server/entity/*.entity.ts");

  private connectionInstance: Connection = null;

  public get connection() {
    if (this.connectionInstance == null) {
      throw new Error("no DB connection, please call connect() first");
    }
    return this.connectionInstance;
  }

  public async closeAnyConnection() {
    try {
      await getConnection().close();
    } catch (e) {
      // Connection not found
    }
  }

  public async connect(options: Partial<BaseConnectionOptions> = {}) {
    const logging: LoggerOptions = config.DEBUG_TRACE_SQL ? "all" : ["error"];

    const baseConnectionOptions: BaseConnectionOptions = {
      type: null,
      synchronize: false,
      entities: [this.ENTITIES_PATH],
      logging,
      logger: (options.logging || logging) ? dbTypeormLogger : undefined,
      ...options
    };

    let connectionOptions: ConnectionOptions;
    if (config.DB_TYPE === "postgresql") {
      connectionOptions = {
        ...baseConnectionOptions,
        type: "postgres",
        host: config.DB_HOST,
        username: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_NAME
      };
    } else {
      connectionOptions = {
        ...baseConnectionOptions,
        type: "sqlite",
        database: config.DB_SQLITE_FILENAME
      };
    }

    this.connectionInstance = await createConnection(connectionOptions);
    if (options.logging !== false) {
      log.info("TypeORM connection initialized");
    }
  }
}

export default new DB();
