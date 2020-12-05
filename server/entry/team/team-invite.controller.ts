import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import { CustomRequest, CustomResponse } from "server/types";
import teamInviteService from "./team-invite.service";

/**
 * Accept an invite to join an entry's team
 */
export async function inviteAccept(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  await teamInviteService.acceptInvite(res.locals.user, res.locals.entry);
  res.redirect(links.routeUrl(res.locals.entry, "entry"));
}

/**
 * Decline an invite to join an entry's team
 */
export async function inviteDecline(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  await teamInviteService.deleteInvite(res.locals.user, res.locals.entry);
  res.redirect(links.routeUrl(res.locals.user, "user", "feed"));
}
