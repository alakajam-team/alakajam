import { Alert } from "server/types";

export type Validator = (value: any) => Promise<undefined | string> | undefined | string;

export type TestFunction = (value?: any) => Promise<any> | any;

export async function validateForm(reqBody: object, validators: {[fieldName: string]: Validator}): Promise<Alert[] | undefined> {
  const results: Array<undefined | string> = [];
  for (const key of Object.keys(validators)) {
    results.push(await validators[key](reqBody[key]));
  }
  const errors = results.filter((result) => result !== undefined);

  if (errors.length === 0) {
    return undefined;
  } else {
    return errors.map((errorMessage) => ({
      type: "danger",
      message: errorMessage
    }));
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
      return createErrorMessage(value, errorMessage);
    }
  };
}

/**
 * Accepts a given value only if it satisfies ALL specified tests.
 * @param testFunction
 * @param errorMessage
 */
export function allRules(...validators: Validator[]): Validator {
  return async (value?: any) => {
    for (const validator of validators) {
      const result = await validator(value);
      if (result) {
        return result;
      }
    }
    return undefined;
  };
}

/**
 * Accepts a given value only if it satisfies at least one of the specified tests.
 * Example: to make an email optional, use `anyRule([forms.isNotSet, forms.isEmail], "Invalid email")`
 * @param testFunction
 * @param errorMessage
 */
export function anyRule(testFunctions: TestFunction[], errorMessage?: string): Validator {
  return async (value?: any) => {
    for (const testFunction of testFunctions) {
      if (await testFunction(value)) {
        return undefined;
      }
    }
    return createErrorMessage(value, errorMessage);
  };
}

function createErrorMessage(value: any, errorMessage?: string) {
  if (errorMessage) {
    return errorMessage;
  } else if (value) {
    return `Invalid value "${value}"`;
  } else {
    return "Invalid";
  }
}
