import React, { JSX } from "preact";
import { CustomRequest, CustomResponse, Mutable } from "server/types";

export type JSXRenderFunction<T> = (context: T) => JSX.Element;

export function setUpJSXLocals<T extends { csrfToken: Function, csrfTokenHTML: Function }>(req: CustomRequest, res: CustomResponse<Mutable<T>>): void {
  res.locals.csrfToken = () => {
    _detectMissingToken(req);
    return <input type="hidden" name="_csrf" value={req.csrfToken()} />;
  };
  res.locals.csrfTokenHTML = () => {
    _detectMissingToken(req);
    return `<input type="hidden" name="_csrf" value="${req.csrfToken()}" />`;
  }
}

function _detectMissingToken(req: CustomRequest) {
  if (!req.csrfToken) {
    throw new Error("No CSRF token available, you must add the csrf middleware to this route");
  }
}
