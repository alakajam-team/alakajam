import { BookshelfModel } from "bookshelf";
import cache from "server/core/cache";
import * as models from "server/core/models";

export class ThemeStatsService {

  public async refreshEventThemeStats(event: BookshelfModel) {
    await event.load("details");
    const eventDetails = event.related<BookshelfModel>("details");

    eventDetails.set("theme_count",
      await models.Theme.where({
        event_id: event.get("id"),
      }).count());
    eventDetails.set("active_theme_count",
      await models.Theme.where({
        event_id: event.get("id"),
        status: "active",
      }).count());
    eventDetails.set("theme_vote_count",
      await models.ThemeVote.where({
        event_id: event.get("id"),
      }).count());
    await eventDetails.save();

    cache.eventsById.del(event.get("id"));
    cache.eventsByName.del(event.get("name"));
  }

}

export default new ThemeStatsService();
