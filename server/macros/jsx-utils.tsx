import { JSX } from "preact";

export type JSXProvider = () => JSX.Element | JSX.Element[] | string;

export function get(callback: JSXProvider) {
  return callback();
}

export function ifTrue(expression: boolean, callback: JSXProvider) {
  if (expression) {
    return callback();
  }
}

export function ifFalse(expression: boolean, callback: JSXProvider) {
  return ifTrue(!expression, callback);
}

export function ifSet(value: any, callback: JSXProvider) {
  if (value !== undefined && value !== null && (typeof value !== "string" || value.trim() !== "")) {
    return callback();
  }
}

export function ifNotSet(value: any, callback: JSXProvider) {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return callback();
  }
}
