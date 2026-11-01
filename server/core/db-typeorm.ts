import { BaseDataSourceOptions } from "typeorm/data-source/BaseDataSourceOptions";
import { DataSource, DataSourceOptions } from "typeorm";
import { LoggerOptions } from "typeorm/logger/LoggerOptions";
import config from "./config";
import dbTypeormLogger from "./db-typeorm-logger";
import log from "./log";

/**
 * Connection to a relational database (PostgreSQL or SQLite), through the TypeORM library.
 *
 * /!\ Work in progress. The goal is to progressively migrate from Bookshelf to TypeORM.
 */
export class DB {

  private dataSourceInstance: DataSource = null;

  public get dataSource(): DataSource {
    if (this.dataSourceInstance == null) {
      throw new Error("no DB connection, please call connect() first");
    }
    return this.dataSourceInstance;
  }

  public async closeAnyConnection(): Promise<void> {
    if (this.dataSourceInstance?.isInitialized) {
      await this.dataSourceInstance.destroy();
    }
    this.dataSourceInstance = null;
  }

  public async connect(options: Partial<BaseDataSourceOptions> = {}): Promise<void> {
    let logging: LoggerOptions = ["error"];
    if (options.logging !== undefined) {
      logging = options.logging;
    }
    if (config.DEBUG_TRACE_SQL) {
      logging = "all";
    }

    // Loaded lazily: entities import this module to reach the data source, so a top-level import would be circular
    const { entities, subscribers } = await import("../entity");
    const baseDataSourceOptions: Omit<BaseDataSourceOptions, "type" | "poolSize"> = {
      synchronize: false,
      entities,
      subscribers,
      logging,
      logger: logging ? dbTypeormLogger : undefined,
      ...options
    };

    let dataSourceOptions: DataSourceOptions;
    if (config.DB_TYPE === "postgresql") {
      dataSourceOptions = {
        ...baseDataSourceOptions,
        type: "postgres",
        host: config.DB_HOST,
        username: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_NAME
      };
    } else {
      dataSourceOptions = {
        ...baseDataSourceOptions,
        type: "sqlite",
        database: config.DB_SQLITE_FILENAME
      };
    }

    this.dataSourceInstance = await new DataSource(dataSourceOptions).initialize();
    if (options.logging !== false) {
      log.info("TypeORM connection initialized");
    }
  }
}

export default new DB();
