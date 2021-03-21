import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "../event.middleware";
import eventParticipationService from "./event-participation.service";
import links from "server/core/links";
import forms from "server/core/forms";
import constants from "server/core/constants";
import userService from "server/user/user.service";

/**
 * Manage my streamer participation to an event
 */
export async function viewStreamerPreferences(req: CustomRequest, res: CustomResponse<EventLocals>): Promise<void> {
  const { user, event } = res.locals;

  if (!user) {
    res.redirectToLogin();
    return;
  }

  const eventParticipation = await eventParticipationService.getEventParticipation(event.get("id"), user.id);
  if (!eventParticipation?.isStreamer) {
    res.errorPage(403, "User is not registered as a streamer");
    return;
  }

  res.locals.pageTitle += " | Event dashboard | Preferences";

  await user.loadDetails();
  res.render<EventLocals>("event/dashboard/event-my-dashboard-streamer", {
    ...res.locals,
    eventParticipation: await eventParticipationService.getEventParticipation(event.get("id"), user.id)
  });
}

export async function saveStreamerPreferences(req: CustomRequest, res: CustomResponse<EventLocals>): Promise<void> {
  const { user, event } = res.locals;
  const streamerDescription = forms.sanitizeString(req.body["streamer-description"], { maxLength: constants.MAX_DESCRIPTION });

  if (req.body.submit !== undefined) {
    const hasJoinedAsStreamer = eventParticipationService.hasJoinedEvent(event, user, { asStreamer: true });
    if (!eventParticipationService.canJoinEvent(event)  && !hasJoinedAsStreamer) {
      res.errorPage(403, "Streamer entries are closed");
      return;
    }

    const existingEventParticipation = await eventParticipationService.getEventParticipation(event.get("id"), user.id);
    await eventParticipationService.setStreamingPreferences(event, user, {
      streamerStatus: existingEventParticipation?.streamerStatus || "requested",
      streamerDescription
    });

    await user.loadDetails();
    const socialLinks = user.details.social_links;
    socialLinks.twitch = forms.sanitizeString(req.body.twitch);
    socialLinks.youtube = forms.sanitizeString(req.body.youtube);
    await userService.save(user);

    res.locals.alerts.push({
      type: "success",
      message: "Settings saved."
    });

    res.redirect(links.routeUrl(event, "event", "dashboard-streamer-preferences"));

  } else if (req.body["cancel-participation"] !== undefined) {
    await eventParticipationService.setStreamingPreferences(event, user, {
      streamerStatus: "off",
      streamerDescription
    });
    res.redirect(links.routeUrl(event, "event", "dashboard"));

  } else {
    res.redirect(links.routeUrl(event, "event", "dashboard-streamer-preferences"));
  }
}
