import forms from "server/core/forms";
import { rule, validateForm } from "server/core/forms-validation";
import links from "server/core/links";
import security from "server/core/security";
import { StreamerStatus } from "server/entity/event-participation.entity";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";
import { In, Not } from "typeorm";
import eventParticipationService from "./dashboard/event-participation.service";
import { EventLocals } from "./event.middleware";

export async function eventStreamers(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { user, event } = res.locals;

  const eventParticipations = await eventParticipationService.getEventParticipations({
    eventId: event.get("id"),
    streamerStatus: security.isMod(user) ? Not("off") : In(["approved", "requested"])
  });

  res.render("event/event-streamers.html", {
    eventParticipations
  });
}

export async function moderateEventStreamers(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { event, user } = res.locals;

  if (!security.isMod(user)) {
    res.errorPage(403);
    return;
  }

  let streamerStatus: StreamerStatus | undefined;
  if (!forms.isId(req.body.targetUserId)) {
    res.locals.alerts.push({ type: "danger", message: "Invalid user" });
  }
  if (req.body.approve !== undefined) { streamerStatus = "approved"; }
  if (req.body.reset !== undefined) { streamerStatus = "requested"; }
  if (req.body.ban !== undefined) { streamerStatus = "banned"; }
  if (!streamerStatus) {
    res.locals.alerts.push({ type: "danger", message: "Invalid action" });
  }

  if (res.locals.alerts.length === 0) {
    const targetUser = await userService.findById(parseInt(req.body.targetUserId, 10));
    const ep = await eventParticipationService.getEventParticipation(event, targetUser);
    if (ep) {
      await eventParticipationService.setStreamingPreferences(event, targetUser, {
        streamerStatus,
        streamerDescription: ep.streamerDescription
      });
    }
  }

  res.redirect(links.routeUrl(event, "event", "streamers"));
}
