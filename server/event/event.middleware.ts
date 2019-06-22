import eventService from "server/event/event.service";
import postService from "server/post/post.service";

/**
 * Fetches the event & optionally the user's entry
 */
export async function eventMiddleware(req, res, next) {
  if (req.baseUrl.indexOf("/external-entry") !== 0) {
    const event = await eventService.findEventByName(req.params.eventName);
    res.locals.event = event;
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
        .then((announcement) => { res.locals.latestEventAnnouncement = announcement; });
      const userShortcutTasks = handleEventUserShortcuts(res, res.locals.event);

      await Promise.all([announcementTask, userShortcutTasks]);
    }
  }
  next();
}

export function handleEventUserShortcuts(res, targetEvent) {
  if (targetEvent && res.locals.user) {
    let entryTask: any = true;
    let userPostTask: any = true;

    entryTask = eventService.findUserEntryForEvent(res.locals.user, targetEvent.get("id"))
      .then((userEntry) => { res.locals.userEntry = userEntry; });
    userPostTask = postService.findPost({
      userId: res.locals.user.id,
      eventId: targetEvent.id,
      specialPostType: null,
    })
      .then((userPost) => { res.locals.userPost = userPost; });

    return Promise.all([entryTask, userPostTask]);
  }
}
