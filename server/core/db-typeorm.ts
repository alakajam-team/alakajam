import * as path from "path";
import { Connection, ConnectionOptions, createConnection } from "typeorm";
import { BaseConnectionOptions } from "typeorm/connection/BaseConnectionOptions";
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

  private readonly ENTITIES_PATH = path.resolve(constants.ROOT_PATH, "server/entity/*.entity.ts");

  private connectionInstance: Connection = null;

  public get connection() {
    if (this.connectionInstance == null) { throw new Error("no DB connection, please call connect() first"); }
    return this.connectionInstance;
  }

  public async connect() {
    const baseConnectionOptions: BaseConnectionOptions = {
      type: null,
      synchronize: false,
      entities: [this.ENTITIES_PATH],
      logging: config.DEBUG_TRACE_SQL ? "all" : ["error"],
      logger: dbTypeormLogger
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
    log.info("TypeORM connection initialized");
  }
}

export default new DB();
