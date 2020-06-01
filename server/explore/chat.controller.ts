import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse } from "server/types";
import chatTemplate from "./chat.template";

/**
 * IRC / Discord Chat
 */
export async function chat(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  res.locals.pageTitle = "Chat";

  res.renderJSX(chatTemplate, res.locals);
}
