import React, { JSX } from "preact";
import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse, Mutable } from "server/types";

export type JSXRenderFunction<T extends CommonLocals> = (context: T) => JSX.Element;

export function setUpJSXLocals(req: CustomRequest, res: CustomResponse<Mutable<CommonLocals>>): void {
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
