import { CommonLocals } from "server/common.middleware";
import { Alert, CustomResponse } from "server/types";

export function isAlertPresent<T extends CommonLocals>(
  res: CustomResponse<T>, exectedAlert: Partial<Alert>): boolean {
  return res.locals.alerts.some((actualAlert) => objectsMatch(actualAlert, exectedAlert));
}

export function objectsMatch<T extends object>(actual: T, expected: Partial<T>): boolean {
  return Object.entries(expected)
    .every((expectedEntry) => actual[expectedEntry[0]] === expectedEntry[1]);
}
