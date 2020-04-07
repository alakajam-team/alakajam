import config from "server/core/config";
import { ColumnOptions, ColumnType } from "typeorm";
import { add } from "winston";

const dbSpecificTypes: Record<string, ColumnType> = {
  dateTime: "date",
};
if (config.DB_TYPE === "postgresql") {
  dbSpecificTypes.dateTime = "timestamp with time zone";
}

export class ColumnTypes {

  /**
   * Date time column.
   * If you want to remove the default value of NOW(), specify `() => undefined` to the `default` option field.
   * @param additionalOptions 
   */
  public static dateTime(additionalOptions: ColumnOptions = {}): ColumnOptions {
    return {
      type: dbSpecificTypes.dateTime,
      ...additionalOptions
    };
  }

  public static varchar(additionalOptions: ColumnOptions = {}): ColumnOptions {
    return {
      type: "varchar",
      length: 255,
      ...additionalOptions
    };
  }

  /**
   *
   * @param precision number of total digits, either before or after the decimal point
   * @param scale number of digits located after the comma
   * @param additionalOptions
   */
  public static numeric(precision: number, scale: number, additionalOptions: ColumnOptions = {}): ColumnOptions {
    return {
      type: "numeric",
      precision,
      scale,
      ...additionalOptions
    };
  }

  public static json(additionalOptions: ColumnOptions = {}): ColumnOptions {
    return {
      type: "simple-json",
      ...additionalOptions,
      length: undefined, // Length is unsupported by TypeORM
    };
  }

}

export type NodeType = "entry" | "post";

export type PermissionType = "read" | "write" | "manage";
