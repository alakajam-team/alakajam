import { CommonLocals } from "server/common.middleware";
import entryHotnessService from "server/entry/entry-hotness.service";
import { CustomRequest, CustomResponse } from "server/types";
import eventService from "../../event/event.service";
import { BookshelfModel } from "bookshelf";
import entryService from "server/entry/entry.service";
import karmaService from "server/event/ratings/karma.service";
import ratingService from "server/event/ratings/rating.service";

export interface AdminEventsContext extends CommonLocals {
  events: BookshelfModel[];
}

/**
 * Events management
 */
export async function adminEvents(_req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  const eventsCollection = await eventService.findEvents();

  res.render<AdminEventsContext>("admin/events/admin-events", {
    ...res.locals,
    events: eventsCollection.models
  });
}

export async function adminEventsPost(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  if (req.body.refreshHotness !== undefined) {
    const eventsCollection = await eventService.findEvents();
    for (const event of eventsCollection.models) {
      await entryHotnessService.refreshEntriesHotness(event);
    }
    res.locals.alerts.push({ type: "success", message: "Hotness recalculated on all entries." });
  }

  res.redirect(req.url);
}
