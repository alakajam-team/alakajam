import { JSX } from "preact";

export type JSXContent = JSX.Element | JSX.Element[] | string;

export type JSXProvider = () => JSXContent;

export function get(callback: JSXProvider): JSXContent {
  return callback();
}

export function ifTrue(expression: boolean, callback: JSXProvider): JSXContent | undefined {
  if (expression) {
    return callback();
  }
}

export function ifFalse(expression: boolean, callback: JSXProvider): JSXContent | undefined {
  return ifTrue(!expression, callback);
}

export function ifSet<T>(value: T, callback: JSXProvider): JSXContent | undefined {
  if (value !== undefined && value !== null && (typeof value !== "string" || value.trim() !== "")) {
    return callback();
  }
}

export function ifNotSet<T>(value: T, callback: JSXProvider): JSXContent | undefined {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return callback();
  }
}
