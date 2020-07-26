import * as React from "preact";
import { JSX } from "preact";
import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse, Mutable } from "server/types";

export type JSXRenderFunction<T extends CommonLocals> = (context: T) => JSX.Element;

export function setUpJSXLocals(req: CustomRequest, res: CustomResponse<Mutable<CommonLocals>>) {
  res.locals.csrfToken = () => <input type="hidden" name="_csrf" value={req.csrfToken()} />;
}
