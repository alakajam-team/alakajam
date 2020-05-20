import links from "server/core/links";
import { CustomRequest, CustomResponse } from "server/types";
import eventParticipationService from "./event-participation.service";
import { EventLocals } from "./event.middleware";

/**
 * Join or leave event
 */
export async function joinEvent(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { user, event } = res.locals;

  if (!user) {
    res.redirectToLogin();
    return;
  }

  if (req.query.leave) {
    await eventParticipationService.leaveEvent(event, user);
    res.redirect("/");
  } else {
    await eventParticipationService.joinEvent(event, user);
    res.redirect(links.routeUrl(event, "event", "my-entry"));
  }

}
