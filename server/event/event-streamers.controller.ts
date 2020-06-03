import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "./event.middleware";
import eventParticipationService from "./dashboard/event-participation.service";
import links from "server/core/links";

export async function eventStreamers(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { event } = res.locals;

  const eventParticipations = await eventParticipationService.getEventParticipations({
    eventId: event.get("id"),
    isStreamer: true
  });

  res.render("event/event-streamers.html", {
    eventParticipations
  });
}

export async function moderateEventStreamers(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { event } = res.locals;

  // TODO Mod tools

  res.redirect(links.routeUrl(event, "event", "streamers"));
}
