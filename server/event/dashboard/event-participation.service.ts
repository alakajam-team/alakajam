import { BookshelfModel } from "bookshelf";
import cache from "server/core/cache";
import enums from "server/core/enums";
import { EventParticipation, StreamerStatus } from "server/entity/event-participation.entity";
import { User } from "server/entity/user.entity";
import entryHighscoreService from "server/entry/highscore/highscore.service";
import { FindConditions, getRepository, In, Not } from "typeorm";
import tournamentService from "../tournament/tournament.service";

export class EventParticipationService {

  public canJoinEvent(event: BookshelfModel): boolean {
    return event.get("status") !== enums.EVENT.STATUS.CLOSED;
  }

  public async joinEvent(event: BookshelfModel, user: User): Promise<void> {
    const epRepository = getRepository(EventParticipation);
    if (!await this.hasJoinedEvent(event, user)) {
      await epRepository.save(new EventParticipation(event.get("id"), user.id));
    }

    await this.refreshParticipationCount(event);
  }

  public async leaveEvent(event: BookshelfModel, user: User): Promise<void> {
    const epRepository = getRepository(EventParticipation);

    const eventParticipation = await this.getEventParticipation(event.get("id"), user.id);
    if (eventParticipation) {
      const tournamentRefreshRequired = this.isTournamentRefreshRequired(event, eventParticipation.isStreamer, false);
      await epRepository.delete({
        eventId: event.get("id"),
        userId: user.id
      });
      if (tournamentRefreshRequired) {
        // XXX Performance
        await tournamentService.recalculateAllTournamentScores(event);
      }

      await this.refreshParticipationCount(event);
    }
  }

  public async countParticipants(event: BookshelfModel): Promise<number> {
    const epRepository = getRepository(EventParticipation);
    return epRepository.count({
      where: {
        eventId: event.get("id")
      }
    });
  }

  public async hasJoinedEvent(event: BookshelfModel, user: User, options: { asStreamer?: boolean } = {}): Promise<boolean> {
    if (!user) {
      return false;
    }
    const eventParticipation = await this.getEventParticipation(event.get("id"), user.id);
    if (options.asStreamer === true) {
      return eventParticipation.isStreamer;
    } else {
      return Boolean(eventParticipation);
    }
  }

  private isTournamentRefreshRequired(event: BookshelfModel, wasStreamer: boolean, isNowStreamer: boolean) {
    return event.get("status_tournament") === enums.EVENT.STATUS_TOURNAMENT.PLAYING && wasStreamer !== isNowStreamer;
  }

  public async setStreamingPreferences(event: BookshelfModel, user: User,
                                       preferences: { streamerStatus: StreamerStatus; streamerDescription: string }): Promise<void> {
    const eventParticipation = await this.getEventParticipation(event.get("id"), user.id);

    if (eventParticipation) {
      const tournamentRefreshRequired = this.isTournamentRefreshRequired(event,
        eventParticipation.isStreamer, ["requested", "approved"].includes(preferences.streamerStatus));

      eventParticipation.streamerStatus = preferences.streamerStatus;
      eventParticipation.streamerDescription = preferences.streamerDescription;
      const epRepository = getRepository(EventParticipation);
      await epRepository.save(eventParticipation);

      if (tournamentRefreshRequired) {
        // XXX Performance
        await tournamentService.recalculateAllTournamentScores(event);
      }
    } else {
      throw new Error("This user has not joined the event");
    }
  }

  public async getEventParticipation(eventId: number, userId: number): Promise<EventParticipation | undefined> {
    if (userId) {
      const epRepository = getRepository(EventParticipation);
      return epRepository.findOne({
        where: {
          eventId,
          userId
        }
      });
    }
  }

  public async getEventParticipations(event: BookshelfModel, options:
  { filter?: "streamers" | "all-streamer-states" } = {}): Promise<EventParticipation[]> {
    const criteria: FindConditions<EventParticipation> = { eventId: event.get("id") };
    if (options.filter === "all-streamer-states") { criteria.streamerStatus = Not("off"); }
    if (options.filter === "streamers") { criteria.streamerStatus = In(["approved", "requested"]); }

    const epRepository = getRepository(EventParticipation);
    return epRepository.find({
      where: criteria,
      relations: ["user", "user.details"],
      order: {
        id: "ASC" // By joining order
      }
    });
  }

  public async getStreamerIds(event: BookshelfModel, options:
  { filter: "streamers" | "all-streamer-states" } = { filter: "streamers" }): Promise<number[]> {
    const streamerParticipations = await this.getEventParticipations(event, options);
    return streamerParticipations.map((ep) => ep.userId);
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
