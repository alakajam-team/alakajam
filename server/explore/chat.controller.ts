import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse } from "server/types";

/**
 * IRC / Discord Chat
 */
export async function chat(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  res.locals.pageTitle = "Chat";

  res.render("explore/chat", res.locals);
}
