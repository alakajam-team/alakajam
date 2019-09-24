export type Validator = (value: any) => Promise<undefined | string> | undefined | string;

export type TestFunction = (value?: any) => Promise<boolean> | boolean;

export async function validateObject(object: object, validators: {[key: string]: Validator})
    : Promise<undefined | string> {
  const results: Array<undefined | string> = [];
  for (const key of Object.keys(validators)) {
    results.push(await validators[key](object[key]));
  }
  const errors = results.filter((result) => result !== undefined);

  if (errors.length === 0) {
    return undefined;
  } else {
    return errors.join(", ");
  }
}

/**
 * Accepts a given value only if it satisfies the specified test.
 * Note: if the field is not set, the test function might fail and trigger an error (= required field).
 * @param testFunction
 * @param errorMessage
 */
export function rule(testFunction: TestFunction, errorMessage?: string): Validator {
  return async (value?: any) => {
    if (await testFunction(value)) {
      return undefined;
    } else {
      return _errorMessage(value, errorMessage);
    }
  };
}

/**
 * Accepts a given value only if it satisfies ALL specified tests.
 * Note: if the field is not set, the test function might fail and trigger an error (= required field).
 * @param testFunction
 * @param errorMessage
 */
export function allRules(testFunctions: TestFunction[], errorMessage?: string): Validator {
  return async (value?: any) => {
    for (const testFunction of testFunctions) {
      if (await testFunction(value) === false) {
        return _errorMessage(value, errorMessage);
      }
    }
    return undefined;
  };
}

/**
 * Accepts a given value only if it satisfies one of the specified tests.
 * Note: if the field is not set, the test function might fail and trigger an error (= required field).
 * @param testFunction
 * @param errorMessage
 */
export function anyRule(testFunctions: TestFunction[], errorMessage?: string): Validator {
  return async (value?: any) => {
    for (const testFunction of testFunctions) {
      if (await testFunction(value) === true) {
        return undefined;
      }
    }
    return _errorMessage(value, errorMessage);
  };
}

function _errorMessage(value: any, errorMessage?: string) {
  if (errorMessage) {
  return errorMessage;
  } else if (value) {
    return `Invalid value "${value}"`;
  } else {
    return `Invalid`;
  }
}
