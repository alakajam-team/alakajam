import { Logger, QueryRunner } from "typeorm";
import config from "./config";
import log from "./log";

const appLogger = log;

class TypeORMLogger implements Logger {
  public logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    if (config.DEBUG_TRACE_SQL) {
      appLogger.info(query, parameters);
    }
  }
  public logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    appLogger.error(error, query, parameters);
  }
  public logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    if (config.DEBUG_TRACE_SLOW_SQL) {
      appLogger.warn(`Slow query detected (${time}ms)`, query, parameters);
    }
  }
  public logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    appLogger.debug(message);
  }
  public logMigration(message: string, queryRunner?: QueryRunner) {
    appLogger.info(message);
  }
  public log(level: "log" | "info" | "warn", message: any, queryRunner?: QueryRunner) {
    const appLevel = level === "log" ? "debug" : level;
    appLogger[appLevel](message);
  }
}

export default new TypeORMLogger();
