export function ifTrue(expression: boolean, callback: () => JSX.Element | JSX.Element[]) {
  if (expression) {
    return callback();
  }
}

export function ifSet(value: any, callback: () => JSX.Element | JSX.Element[]) {
  if (value !== undefined) {
    return callback();
  }
}
