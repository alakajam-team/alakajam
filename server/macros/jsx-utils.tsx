import { JSX } from "preact";

export function get(callback: () => JSX.Element | JSX.Element[]) {
  return callback();
}

export function ifTrue(expression: boolean, callback: () => JSX.Element | JSX.Element[]) {
  if (expression) {
    return callback();
  }
}

export function ifFalse(expression: boolean, callback: () => JSX.Element | JSX.Element[]) {
  return ifTrue(!expression, callback);
}

export function ifSet(value: any, callback: () => JSX.Element | JSX.Element[]) {
  if (value !== undefined) {
    return callback();
  }
}
