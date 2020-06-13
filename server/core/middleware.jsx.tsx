import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import { CustomResponse, CustomRequest, Mutable } from "server/types";

export type JSXRenderFunction<T extends CommonLocals> = (context: T) => JSX.Element;

export function setUpJSXLocals(req: CustomRequest, res: CustomResponse<Mutable<CommonLocals>>) {
  res.locals.csrfTokenJSX = () => <input type="hidden" name="_csrf" value={req.csrfToken()} />;
}
