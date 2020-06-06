import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "./event.middleware";
import eventParticipationService from "./dashboard/event-participation.service";
import links from "server/core/links";
import { In } from "typeorm";

export async function eventStreamers(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { event } = res.locals;

  const eventParticipations = await eventParticipationService.getEventParticipations({
    eventId: event.get("id"),
    streamerStatus: In(["approved", "requested"])
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
