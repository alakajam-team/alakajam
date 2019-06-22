import { Request, Response } from "express";
import templating from "server/core/templating-functions";
import eventService from "server/event/event.service";

/**
 * Accept an invite to join an entry's team
 */
export async function acceptInvite(req: Request, res: Response) {
  await eventService.acceptInvite(res.locals.user, res.locals.entry);
  res.redirect(templating.buildUrl(res.locals.entry, "entry"));
}

/**
 * Decline an invite to join an entry's team
 */
export async function declineInvite(req: Request, res: Response) {
  await eventService.deleteInvite(res.locals.user, res.locals.entry);
  res.redirect(templating.buildUrl(res.locals.user, "user", "feed"));
}
