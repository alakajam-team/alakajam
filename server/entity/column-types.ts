import config from "server/core/config";
import { ColumnOptions } from "typeorm";

const types = {
  dateTime: "date",
};
if (config.DB_TYPE === "postgresql") {
  types.dateTime = "timestamp with time zone";
}

export class ColumnTypes {

  public static dateTime(additionalOptions: ColumnOptions = {}): ColumnOptions {
    return Object.assign({ type: types.dateTime }, additionalOptions);
  }

  public static varchar(additionalOptions: ColumnOptions = {}): ColumnOptions {
    return Object.assign({ type: "varchar", length: 255 }, additionalOptions);
  }

}

export type NodeType = "entry" | "post";
