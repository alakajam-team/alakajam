import Bluebird from "bluebird";
import { BookshelfCollection, BookshelfModel } from "bookshelf";
import leftPad from "left-pad";
import { intersection } from "lodash";
import cache from "server/core/cache";
import constants from "server/core/constants";
import db from "server/core/db";
import enums from "server/core/enums";
import * as models from "server/core/models";
import { EventFlags } from "server/entity/event-details.entity";
import { EntryScoresMap } from "server/entity/tournament-score.entity";
import eventParticipationService from "../dashboard/event-participation.service";

export const CACHE_KEY_ACTIVE_TOURNAMENT_EVENT = "active-tournament-event";

/**
 * Service for managing tournaments.
 */
export class TournamentService {

  public async findActiveTournamentPlaying(entryId: number): Promise<BookshelfModel> {
    if (entryId) {
      const activeTournamentEvent = await this.findActiveTournament();
      if (activeTournamentEvent) {
        const tEntriesCollection = activeTournamentEvent.related<BookshelfCollection>("tournamentEntries");
        for (const tEntry of tEntriesCollection.models) {
          if (tEntry.get("entry_id") === entryId) {
            return activeTournamentEvent;
          }
        }
      }
    }
    return undefined;
  }

  private async findActiveTournament(): Promise<BookshelfModel> {
    return cache.getOrFetch<BookshelfModel>(cache.general, CACHE_KEY_ACTIVE_TOURNAMENT_EVENT, async () => {
      return models.Event
        .where("status_tournament", "IN", [enums.EVENT.STATUS_TOURNAMENT.PLAYING, enums.EVENT.STATUS_TOURNAMENT.CLOSED])
        .fetch({ withRelated: ["tournamentEntries"] });
    });
  }

  public async findTournamentEntries(event: BookshelfModel, options: { withDetails?: boolean } = {}): Promise<BookshelfModel[]> {
    if (options.withDetails) {
      await event.load(["tournamentEntries.entry.userRoles", "tournamentEntries.entry.details"]);
    } else {
      await event.load(["tournamentEntries.entry.userRoles"]);
    }
    return event.related<BookshelfCollection>("tournamentEntries")
      .sortBy((tEntry) => tEntry.get("ordering"));
  }

  public async canEnterTournament(event: BookshelfModel, userId: number): Promise<boolean> {
    const eventFlags = event.related<BookshelfModel>("details").get("flags") as EventFlags;
    if (eventFlags.streamerOnlyTournament) {
      const eventParticipation = await eventParticipationService.getEventParticipation(event.get("id"), userId);
      return eventParticipation?.isApprovedStreamer;
    } else {
      return true;
    }
  }

  public async addTournamentEntry(eventId: number, entryId: number): Promise<BookshelfModel> {
    let tEntry = await this.getTournamentEntry(eventId, entryId);
    if (!tEntry) {
      tEntry = new models.TournamentEntry({
        event_id: eventId,
        entry_id: entryId,
      }) as BookshelfModel;
      await tEntry.save();
    }
    return tEntry;
  }

  public async saveTournamentEntryOrdering(eventId: number, entryId: number, ordering: number): Promise<BookshelfModel> {
    const tEntry = await this.getTournamentEntry(eventId, entryId);
    tEntry.set("ordering", ordering);
    return tEntry.save();
  }

  public async removeTournamentEntry(eventId: number, entryId: number) {
    const tEntry = await this.getTournamentEntry(eventId, entryId);
    if (tEntry) {
      await tEntry.destroy();
    }
  }

  public async findOrCreateTournamentScore(eventId: number, userId: number) {
    const attributes = {
      event_id: eventId,
      user_id: userId,
    };
    let tScore = await models.TournamentScore
      .where(attributes)
      .fetch();
    if (!tScore) {
      tScore = new models.TournamentScore(attributes) as BookshelfModel;
    }
    return tScore;
  }

  public async findTournamentScores(event): Promise<BookshelfCollection> {
    return models.TournamentScore
      .where("event_id", event.get("id"))
      .where("score", ">", 0)
      .orderBy("ranking")
      .fetchAll({ withRelated: ["user"] }) as Bluebird<BookshelfCollection>;
  }

  public async refreshTournamentScores(
    highScoreService: any,
    event: BookshelfModel,
    triggeringUserId?: number,
    impactedEntryScores: BookshelfModel[] = [],
    options: { allowedTournamentStates?: string[] } = {}) {
    const allowedTournamentStates = options.allowedTournamentStates || [enums.EVENT.STATUS_TOURNAMENT.PLAYING];
    if (!allowedTournamentStates.includes(event.get("status_tournament"))) {
      return;
    }

    // Handle streamer only tournaments
    let allowedUserIds: number[] | "everyone" = "everyone";
    await event.load("details");
    const eventFlags: EventFlags = event.related<BookshelfModel>("details").get("flags");
    if (eventFlags.streamerOnlyTournament) {
      allowedUserIds = await eventParticipationService.getStreamerIds(event);
    }
    if (allowedUserIds !== "everyone" && !allowedUserIds.includes(triggeringUserId)) {
      return;
    }

    const tEntries = await this.findTournamentEntries(event);
    const entries = tEntries.map((tEntry) => tEntry.related("entry")) as BookshelfModel[];
    let tournamentScoresHaveChanged = false;

    // Make sure tournament scores are updated for both the user who directly saved a score
    // (we at least need to refresh his entry_scores cache), plus the other users that were pushed down in the rankings
    // in the process (skip those who are out of the points though, nothing will change for them)
    const userIdsToUpdate = [];
    if (triggeringUserId) {
      userIdsToUpdate.push(triggeringUserId);
    }
    for (const entryScore of impactedEntryScores) {
      // include 11th player in case we need to remove his point
      if (entryScore.get("ranking") <= constants.TOURNAMENT_POINTS_DISTRIBUTION.length + 1) {
        if (!userIdsToUpdate.includes(entryScore.get("user_id"))
          && (allowedUserIds === "everyone" || allowedUserIds.includes(entryScore.get("user_id")))) {
          userIdsToUpdate.push(entryScore.get("user_id"));
        }
      }
    }

    // Recalculate tournament scores
    for (const userIdToUpdate of userIdsToUpdate) {
      tournamentScoresHaveChanged = (await this.refreshTournamentScoresForUser(highScoreService,
        event, entries, userIdToUpdate)) || tournamentScoresHaveChanged;
    }

    // Refresh tournament rankings if there was any actual change to the scores
    if (tournamentScoresHaveChanged) {
      await this.refreshTournamentRankings(event);
    }
  }

  public async refreshTournamentScoresForUser(highScoreService: any, event: BookshelfModel, entries: BookshelfModel[], userId: number) {
    // Fetch or create tournament score
    const eventId = event.get("id");
    const tournamentScoreKeys = {
      event_id: eventId,
      user_id: userId,
    };
    let tournamentScore = await models.TournamentScore
      .where(tournamentScoreKeys)
      .fetch();
    if (!tournamentScore) {
      tournamentScore = new models.TournamentScore({
        event_id: eventId,
        user_id: userId,
      }) as BookshelfModel;
    }

    // (Re)-calculate score info
    let totalScore = 0;
    const entryScores: EntryScoresMap = {};
    const entryScoresMap = await highScoreService.findUserScoresMapByEntry(userId, entries);
    Object.keys(entryScoresMap).forEach((entryId) => {
      const entryScore = entryScoresMap[entryId];
      if (entryScore && entryScore.get("active")
        && entryScore.get("ranking") <= constants.TOURNAMENT_POINTS_DISTRIBUTION.length) {
        const entryPoints = constants.TOURNAMENT_POINTS_DISTRIBUTION[entryScore.get("ranking") - 1];
        totalScore += entryPoints;
        entryScores[entryId] = { score: entryScore.get("score") };
        if (entryPoints) {
          entryScores[entryId].ranking = entryScore.get("ranking");
        }
      }
    });

    // Update & save
    const tournamentScoreHasChanged = tournamentScore.get("score") !== totalScore;
    tournamentScore.set({
      score: totalScore,
      entry_scores: entryScores,
    });
    await tournamentScore.save();
    return tournamentScoreHasChanged;
  }

  public async refreshTournamentRankings(event: BookshelfModel) {
    const allowedTournamentStates = [enums.EVENT.STATUS_TOURNAMENT.PLAYING, enums.EVENT.STATUS_TOURNAMENT.CLOSED];
    if (allowedTournamentStates.includes(event.get("status_tournament"))) {
      // Fetch ALL tournament scores
      const tournamentEntries = await this.findTournamentEntries(event);
      const tScores = await models.TournamentScore
        .where("event_id", event.get("id"))
        .fetchAll() as BookshelfCollection;

      // Break ties
      const tScoreGroups = tScores.models.reduce((prev, current) => {
        // 1. Regroup ties together
        const score = parseFloat(current.get("score"));
        if (!prev[score]) { prev[score] = []; }
        prev[score].push(current);
        return prev;
      }, {});
      let tScoresWithoutTies = [];
      // 2. Explore ties to merge them back, highest scores first
      Object.keys(tScoreGroups)
        .map(parseFloat)
        .sort((score1, score2) => score2 - score1)
        .forEach((score) => {
          const tScoreGroup = tScoreGroups[score];

          // 3. Sort tied scores
          tScoreGroup.sort((a, b) => {
            return this.tieBreakScore(b, tournamentEntries).localeCompare(this.tieBreakScore(a, tournamentEntries));
          });
          tScoresWithoutTies = tScoresWithoutTies.concat(tScoreGroup);
        });

      let ranking = 1;
      await db.transaction(async (transaction) => {
        for (const tScore of tScoresWithoutTies) {
          if (parseFloat(tScore.get("score")) > 0) {
            if (tScore.get("ranking") !== ranking) {
              tScore.set("ranking", ranking);
              await tScore.save(null, { transacting: transaction });
            }
            ranking++;
          } else {
            await tScore.destroy({ transacting: transaction });
          }
        }
      });

      const tournament_count = ranking - 1;
      if (tournament_count !== event.get("tournament_count")) {
        event.set("tournament_count", tournament_count);
        await event.save();

        cache.general.del(CACHE_KEY_ACTIVE_TOURNAMENT_EVENT);
        cache.eventsById.del(event.get("id"));
        cache.eventsByName.del(event.get("name"));
      }
    }
  }

  public async recalculateAllTournamentScores(highScoreService: any, event: BookshelfModel) {
    // Pick entries for which to fetch scores
    const tournamentEntries = await this.findTournamentEntries(event);
    const entries = tournamentEntries.map((tEntry) => tEntry.related("entry")) as BookshelfModel[];

    // List all users having entry scores
    const entryScores = await db.knex("entry_score")
      .where("entry_id", "IN", entries.map((entry) => entry.get("id")))
      .select("user_id")
      .distinct();
    let refreshScoresForUserIds = entryScores.map((data) => data.user_id);
    const eventFlags = event.related<BookshelfModel>("details").get("flags") as EventFlags;
    let allowedUserIds: number[] | "everyone" = "everyone";
    if (eventFlags.streamerOnlyTournament) {
      allowedUserIds = await eventParticipationService.getStreamerIds(event);
      refreshScoresForUserIds = intersection(refreshScoresForUserIds, allowedUserIds);
    }

    // Append all users having a score in the tournament (might no longer have entry scores)
    const tournamentUserIds = await db.knex("tournament_score")
      .where("event_id", event.get("id"))
      .select("user_id")
      .distinct();

    // Request tournament score refresh for each user
    for (const data of tournamentUserIds) {
      if (allowedUserIds !== "everyone" && !allowedUserIds.includes(data.user_id)) {
        await db.knex("tournament_score")
          .where({
            event_id: event.get("id"),
            user_id: data.user_id
          })
          .delete();
      } else if (refreshScoresForUserIds.includes(data.user_id)) {
        refreshScoresForUserIds.push(data.user_id);
      }
    }
    for (const userId of refreshScoresForUserIds) {
      await this.refreshTournamentScoresForUser(highScoreService, event, entries, userId);
    }
    await this.refreshTournamentRankings(event);
  }

  private tieBreakScore(tScore, tournamentEntries) {
    // Ties are broken by:
    // 1. who has the most 1st places
    // 2. who has the most 2nd places
    // ... (up to 10th place)
    // N+1. Who has the best ranking in the first tournament game
    // N+2. Who has the best ranking in the 2nd tournament game
    // ... (this always breaks ties)
    const scoreData = tScore.get("entry_scores");
    let points = 0;
    const suffix = [];
    if (scoreData) {
      Object.keys(scoreData).forEach((entryId) => {
        const ranking = scoreData[entryId].ranking;
        if (ranking <= 10) {
          points += Math.pow(10, 10 - ranking);
        }
      });
      for (const entry of tournamentEntries) {
        const entryScoreInfo = scoreData[entry.get("entry_id")] || { ranking: 100000 };
        suffix.push(leftPad(100000 - entryScoreInfo.ranking, 5, "0"));
      }
    }

    // Example: 1010000000|99997-99999-00000 means the player had 1 bronze medal on the 1st game,
    // 1 gold medal on the second, and did not play the third.
    // Reverse alphabetical order provides the expected sorting result.
    return leftPad(points, 10, "0") + "|" + suffix.join("-");
  }

  private async getTournamentEntry(eventId: number, entryId: number): Promise<BookshelfModel> {
    return models.TournamentEntry.where({
      event_id: eventId,
      entry_id: entryId,
    })
      .fetch();
  }

}

export default new TournamentService();
