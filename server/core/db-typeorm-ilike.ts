import { Connection, FindOperator, FindOperatorType } from "typeorm";
import * as config from "./config";

class CustomFindOperator<T> extends FindOperator<T> {
  public constructor(
    type: FindOperatorType | "ilike",
    value: FindOperator<T> | T,
    useParameter?: boolean,
    multipleParameters?: boolean,
  ) {
    super(type as any, value, useParameter, multipleParameters);
  }

  public toSql(
    connection: Connection,
    aliasPath: string,
    parameters: string[],
  ): string {
    if ((this as any)._type === "ilike") {
      return `${aliasPath} ILIKE ${parameters[0]}`;
    }

    return super.toSql(connection, aliasPath, parameters);
  }
}

/**
 * ILike Operator. Falls back to Like on SQLite.
 * Example: { someField: ILike("%some sting%") }
 */
export function ILike<T>(
  value: T | FindOperator<T>,
): CustomFindOperator<T> {
  return new CustomFindOperator(config.ilikeOperator(), value);
}
