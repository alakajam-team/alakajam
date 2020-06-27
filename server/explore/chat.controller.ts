import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse } from "server/types";

/**
 * IRC / Discord Chat
 */
export async function chat(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  res.locals.pageTitle = "Chat";

  res.renderJSX("explore/chat", res.locals);
}
