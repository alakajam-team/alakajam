import { Request, Response } from "express";
import links from "server/core/links";
import entryTeamService from "server/entry/entry-team.service";

/**
 * Accept an invite to join an entry's team
 */
export async function inviteAccept(req: Request, res: Response) {
  await entryTeamService.acceptInvite(res.locals.user, res.locals.entry);
  res.redirect(links.routeUrl(res.locals.entry, "entry"));
}

/**
 * Decline an invite to join an entry's team
 */
export async function inviteDecline(req: Request, res: Response) {
  await entryTeamService.deleteInvite(res.locals.user, res.locals.entry);
  res.redirect(links.routeUrl(res.locals.user, "user", "feed"));
}
