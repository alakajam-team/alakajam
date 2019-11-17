
/**
 * Service for managing tournaments.
 *
 * @module services/event-tournament-service
 */

import * as Bluebird from "bluebird";
import { BookshelfCollection } from "bookshelf";
import * as leftPad from "left-pad";
import cache from "server/core/cache";
import constants from "server/core/constants";
import db from "server/core/db";
import enums from "server/core/enums";
import * as models from "server/core/models";

export default {
  findActiveTournament,
  findActiveTournamentPlaying,

  findTournamentEntries,
  addTournamentEntry,
  saveTournamentEntryOrdering,
  removeTournamentEntry,

  findOrCreateTournamentScore,
  findTournamentScores,
  refreshTournamentScores,
  recalculateAllTournamentScores,
};

async function findActiveTournament(options: any = {}) {
  const statusTournamentAllowed = options.statusTournamentAllowed || [enums.EVENT.STATUS_TOURNAMENT.PLAYING];
  const cacheKey = "active-tournament-event-" + statusTournamentAllowed.join("-");
  return cache.getOrFetch(cache.general, cacheKey, async () => {
    return models.Event
      .where("status_tournament", "IN", statusTournamentAllowed)
      .fetch({ withRelated: ["tournamentEntries"] });
  });
}

async function findActiveTournamentPlaying(entryId, options: any = {}) {
  if (entryId) {
    const activeTournamentEvent = await findActiveTournament(options);
    if (activeTournamentEvent) {
      const tEntriesCollection = activeTournamentEvent.related("tournamentEntries") as BookshelfCollection;
      for (const tEntry of tEntriesCollection.models) {
        if (tEntry.get("entry_id") === entryId) {
          return activeTournamentEvent;
        }
      }
    }
  }
  return null;
}

async function findTournamentEntries(event, options: any = {}) {
  if (options.withDetails) {
    await event.load(["tournamentEntries.entry.userRoles", "tournamentEntries.entry.details"]);
  } else {
    await event.load(["tournamentEntries.entry.userRoles"]);
  }
  return event.related("tournamentEntries").sortBy((tEntry) => tEntry.get("ordering"));
}

async function addTournamentEntry(eventId, entryId) {
  let tEntry = await _getTournamentEntry(eventId, entryId);
  if (!tEntry) {
    tEntry = new models.TournamentEntry({
      event_id: eventId,
      entry_id: entryId,
    });
    await tEntry.save();
  }
  return tEntry;
}

async function saveTournamentEntryOrdering(eventId, entryId, ordering) {
  const tEntry = await _getTournamentEntry(eventId, entryId);
  tEntry.set("ordering", ordering);
  return tEntry.save();
}

async function removeTournamentEntry(eventId, entryId) {
  const tEntry = await _getTournamentEntry(eventId, entryId);
  if (tEntry) {
    await tEntry.destroy();
  }
}

async function findOrCreateTournamentScore(eventId, userId) {
  const attributes = {
    event_id: eventId,
    user_id: userId,
  };
  let tScore = await models.TournamentScore
    .where(attributes)
    .fetch();
  if (!tScore) {
    tScore = new models.TournamentScore(attributes);
  }
  return tScore;
}

async function findTournamentScores(event): Promise<BookshelfCollection> {
  return models.TournamentScore
    .where("event_id", event.get("id"))
    .where("score", ">", 0)
    .orderBy("ranking")
    .fetchAll({ withRelated: ["user"] }) as Bluebird<BookshelfCollection>;
}

async function refreshTournamentScores(highScoreService, event, triggeringUserId = null,
                                       impactedEntryScores = [], options: any = {}) {
  const statusTournamentAllowed = options.statusTournamentAllowed || [enums.EVENT.STATUS_TOURNAMENT.PLAYING];
  if (!statusTournamentAllowed.includes(event.get("status_tournament"))) {
    return;
  }

  const tEntries = await findTournamentEntries(event);
  const entries = tEntries.map((tEntry) => tEntry.related("entry"));
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
      if (!userIdsToUpdate.includes(entryScore.get("user_id"))) {
        userIdsToUpdate.push(entryScore.get("user_id"));
      }
    }
  }

  // Recalculate tournament scores
  for (const userIdToUpdate of userIdsToUpdate) {
    tournamentScoresHaveChanged = (await refreshTournamentScoresForUser(highScoreService,
      event.get("id"), entries, userIdToUpdate)) || tournamentScoresHaveChanged;
  }

  // Refresh tournament rankings if there was any actual change to the scores
  if (tournamentScoresHaveChanged) {
    await _refreshTournamentRankings(event);
  }
}

async function refreshTournamentScoresForUser(highScoreService, eventId, entries, userId) {
  // Fetch or create tournament score
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
    });
  }

  // (Re)-calculate score info
  let totalScore = 0;
  const entryScores = {};
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

async function _refreshTournamentRankings(event) {
  const statusTournamentAllowed = [enums.EVENT.STATUS_TOURNAMENT.PLAYING, enums.EVENT.STATUS_TOURNAMENT.CLOSED];
  if (statusTournamentAllowed.includes(event.get("status_tournament"))) {
    // Fetch ALL tournament scores
    const tournamentEntries = await findTournamentEntries(event, { statusTournamentAllowed });
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
          return _tieBreakScore(b, tournamentEntries).localeCompare(_tieBreakScore(a, tournamentEntries));
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

    const entryCount = ranking - 1;
    if (entryCount !== event.get("entry_count")) {
      event.set("entry_count", entryCount);
      await event.save();
      cache.eventsById.del(event.get("id"));
      cache.eventsByName.del(event.get("name"));
    }
  }
}

function _tieBreakScore(tScore, tournamentEntries) {
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

async function recalculateAllTournamentScores(highScoreService, event) {
  // Pick entries for which to fetch scores
  const tournamentEntries = await findTournamentEntries(event);
  const entries = tournamentEntries.map((tEntry) => tEntry.related("entry"));

  // List all users having entry scores
  const entryUserIds = await db.knex("entry_score")
    .where("entry_id", "IN", entries.map((entry) => entry.get("id")))
    .select("user_id")
    .distinct();

  // Append all users having a score in the tournament (might no longer have entry scores)
  const tournamentUserIds = await db.knex("tournament_score")
      .where("event_id", event.get("id"))
      .select("user_id")
      .distinct();

  // Request tournament score refresh for each user
  const allUserIds = entryUserIds.map((data) => data.user_id);
  for (const data of tournamentUserIds) {
    if (allUserIds.indexOf(data.user_id) === -1) { allUserIds.push(data.user_id); }
  }
  for (const userId of allUserIds) {
    await refreshTournamentScoresForUser(highScoreService, event.get("id"), entries, userId);
  }
  await _refreshTournamentRankings(event);
}

async function _getTournamentEntry(eventId, entryId) {
  return models.TournamentEntry.where({
    event_id: eventId,
    entry_id: entryId,
  })
    .fetch();
}
