import { BookshelfModel } from "bookshelf";
import { EventParticipation } from "server/entity/event-participation.entity";
import { User } from "server/entity/user.entity";
import { getRepository } from "typeorm";
import cache from "server/core/cache";

export class EventParticipationService {

  public async joinEvent(event: BookshelfModel, user: User): Promise<void> {
    const epRepository = getRepository(EventParticipation);
    if (!await this.hasJoinedEvent(event, user)) {
      await epRepository.save(new EventParticipation(event.get("id"), user.id));
    }

    await this.refreshParticipationCount(event);
  }

  public async leaveEvent(event: BookshelfModel, user: User): Promise<void> {
    const epRepository = getRepository(EventParticipation);
    await epRepository.delete({
      event_id: event.get("id"),
      user_id: user.id
    });

    await this.refreshParticipationCount(event);
  }

  public async countParticipants(event: BookshelfModel): Promise<number> {
    const epRepository = getRepository(EventParticipation);
    return epRepository.count({
      where: {
        event_id: event.get("id")
      }
    });
  }

  public async hasJoinedEvent(event: BookshelfModel, user: User): Promise<boolean> {
    const epRepository = getRepository(EventParticipation);

    const resultCount = await epRepository.count({
      where: {
        event_id: event.get("id"),
        user_id: user.id
      }
    });

    return resultCount > 0;
  }

  private async refreshParticipationCount(event: BookshelfModel): Promise<void> {
    const eventDetails = event.related<BookshelfModel>("details");
    eventDetails.set("participation_count", await this.countParticipants(event));
    await eventDetails.save();
    cache.eventsById.del(event.get("id"));
    cache.eventsByName.del(event.get("name"));
  }

}

export default new EventParticipationService();
