import { BookshelfModel } from "bookshelf";
import { NextFunction } from "express";
import { CommonLocals } from "server/common.middleware";
import eventService from "server/event/event.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import eventParticipationService from "./dashboard/event-participation.service";
import { EventParticipation } from "server/entity/event-participation.entity";

export interface EventLocals extends CommonLocals {
  /**
   * The current browsed event.
   */
  readonly event: BookshelfModel;

  /**
   * The current user's participation to the browsed event.
   */
  readonly eventParticipation: BookshelfModel;

  /**
   * The latest announcement for the current event.
   */
  readonly latestEventAnnouncement: BookshelfModel;
}

/**
 * Fetches the event & optionally the user's entry
 */
export async function eventMiddleware(req: CustomRequest, res: CustomResponse<CommonLocals>, next: NextFunction) {
  if (!req.baseUrl.startsWith("/external-entry")) {
    const event =  res.locals.event = await eventService.findEventByName(req.params.eventName);

    if (!event) {
      res.errorPage(404, "Event not found");
      return;

    } else {
      if (!res.locals.pageTitle) {
        res.locals.pageTitle = event.get("title");
        res.locals.pageDescription = "An Alakajam! event. Dates: " + event.get("display_dates") + ".";
        if (event.get("display_theme")) {
          res.locals.pageDescription += " Theme: " + event.get("display_theme");
        }
      }

      const announcementTask = postService.findLatestAnnouncement({ eventId: event.id })
        .then(announcement => res.locals.latestEventAnnouncement = announcement);
      const userShortcutTasks = loadUserShortcutsContext(res, res.locals.event);
      const eventParticipationTask = eventParticipationService.getEventParticipation(event.id, res.locals.user?.id)
        .then(eventParticipation => res.locals.eventParticipation = eventParticipation);

      await Promise.all([announcementTask, userShortcutTasks, eventParticipationTask]);
    }
  }
  next();
}

export function loadUserShortcutsContext(
  res: CustomResponse<CommonLocals>,
  targetEvent: BookshelfModel,
  options: { postFromAnyEvent?: boolean } = {}) {
  if (targetEvent && res.locals.user) {
    const entryTask = eventService.findUserEntryForEvent(res.locals.user, targetEvent.get("id"))
      .then((userEntry) => { res.locals.userEntry = userEntry; });
    const userPostTask = postService.findPost({
      userId: res.locals.user.id,
      eventId: options.postFromAnyEvent ? undefined : targetEvent.id,
      specialPostType: null,
    })
      .then((userPost) => { res.locals.userPost = userPost; });

    return Promise.all([entryTask, userPostTask]);
  }
}
