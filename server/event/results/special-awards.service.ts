import { BookshelfModel } from "bookshelf";
import { EventFlags } from "server/entity/event-details.entity";
import caches from "server/core/cache";
export class SpecialAwardsService {

  public isSpecialAwardsEnabled(event: BookshelfModel): boolean {
    const flags: EventFlags = event.related<BookshelfModel>("details").get("flags");
    return Boolean(flags.specialAwards);
  }

  public async saveSpecialAwardsLabels(event: BookshelfModel, specialAwardTitles: string[]): Promise<void> {
    const eventDetails = event.related<BookshelfModel>("details");
    eventDetails.set("special_award_titles", specialAwardTitles);
    await eventDetails.save();

    caches.eventsById.del(event.get("id"));
    caches.eventsByName.del(event.get("name"));
  }

}

export default new SpecialAwardsService();
