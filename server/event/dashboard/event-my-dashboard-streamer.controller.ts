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
export async function viewStreamerPreferences(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { user, event } = res.locals;
  res.locals.pageTitle += " | Event dashboard | Preferences";

  await user.loadDetails();
  res.render("event/dashboard/event-my-dashboard-streamer.html", {
    eventParticipation: await eventParticipationService.getEventParticipation(event, user)
  });
}

export async function saveStreamerPreferences(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { user, event } = res.locals;
  const streamerDescription = forms.sanitizeString(req.body["streamer-description"], { maxLength: constants.MAX_DESCRIPTION });

  if (req.body.submit !== undefined) {
    await eventParticipationService.setStreamingPreferences(event, user, {
      isStreamer: true,
      streamerDescription
    });

    await user.loadDetails();
    const socialLinks = user.details.social_links;
    socialLinks.twitch = forms.sanitizeString(req.body.twitch);
    await userService.save(user);

    res.locals.alerts.push({
      type: "success",
      message: "Preferences saved."
    });

    res.redirect(links.routeUrl(event, "event", "dashboard-streamer-preferences"));

  } else if (req.body["cancel-participation"] !== undefined) {
    await eventParticipationService.setStreamingPreferences(event, user, {
      isStreamer: false,
      streamerDescription
    });
    res.redirect(links.routeUrl(event, "event", "dashboard"));

  } else {
    res.redirect(links.routeUrl(event, "event", "dashboard-streamer-preferences"));
  }
}
