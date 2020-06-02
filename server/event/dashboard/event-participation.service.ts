import { BookshelfModel } from "bookshelf";
import { EventParticipation } from "server/entity/event-participation.entity";
import { User } from "server/entity/user.entity";
import { getRepository } from "typeorm";
import cache from "server/core/cache";

export class EventParticipationService {

  public async joinEvent(event: BookshelfModel, user: User, options: { isStreamer?: boolean; steamerDescription?: string } = {}): Promise<void> {
    const epRepository = getRepository(EventParticipation);
    if (!await this.hasJoinedEvent(event, user)) {
      await epRepository.save(new EventParticipation(event.get("id"), user.id));
    }

    await this.refreshParticipationCount(event);
  }

  public async leaveEvent(event: BookshelfModel, user: User): Promise<void> {
    const epRepository = getRepository(EventParticipation);
    await epRepository.delete({
      eventId: event.get("id"),
      userId: user.id
    });

    await this.refreshParticipationCount(event);
  }

  public async countParticipants(event: BookshelfModel): Promise<number> {
    const epRepository = getRepository(EventParticipation);
    return epRepository.count({
      where: {
        eventId: event.get("id")
      }
    });
  }

  public async hasJoinedEvent(event: BookshelfModel, user: User): Promise<boolean> {
    return (await this.getEventParticipation(event, user)) !== undefined;
  }

  public async setStreamingPreferences(event: BookshelfModel, user: User,
                                       preferences: { isStreamer: boolean; streamerDescription: string }): Promise<void> {
    const eventParticipation = await this.getEventParticipation(event, user);
    if (eventParticipation) {
      eventParticipation.isStreamer = preferences.isStreamer;
      eventParticipation.streamerDescription = preferences.streamerDescription;
      const epRepository = getRepository(EventParticipation);
      await epRepository.save(eventParticipation);
    } else {
      throw new Error("This user has not joined the event");
    }
  }

  public async getEventParticipation(event: BookshelfModel, user: User): Promise<EventParticipation | undefined> {
    if (user) {
      const epRepository = getRepository(EventParticipation);
      return epRepository.findOne({
        where: {
          eventId: event.get("id"),
          userId: user.id
        }
      });
    }
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
