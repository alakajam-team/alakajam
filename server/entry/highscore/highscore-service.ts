
/**
 * Service for importing entries from third-party websites
 *
 * @module services/highscore-service
 */

import db from "server/core/db";
import enums from "server/core/enums";
import fileStorage from "server/core/file-storage";
import forms from "server/core/forms";
import * as models from "server/core/models";
import eventTournamentService from "server/event/event-tournament.service";

export default {
  findHighScores,
  findHighScoresMap,

  findEntryScore,
  findEntryScoreById,
  findUserScores,
  findUserScoresMapByEntry,
  findRecentlyActiveEntries,
  findEntriesLastActivity,

  createEntryScore,
  submitEntryScore,
  setEntryScoreActive,
  deleteEntryScore,
  deleteAllEntryScores,

  isExternalProof,

  refreshEntryRankings,
};

async function findHighScores(entry, options: any = {}) {
  const query = models.EntryScore.where("entry_id", entry.get("id"));
  if (!options.withSuspended) {
    query.where("active", true);
  }
  query.orderBy("ranking");

  const fetchOptions: any = {
    withRelated: ["user"],
  };
  if (options.fetchAll) {
    return query.fetchAll(fetchOptions);
  } else {
    fetchOptions.pageSize = 10;
    return query.fetchPage(fetchOptions);
  }
}

async function findHighScoresMap(entries) {
  entries = entries.models || entries; // Accept collections or arrays

  const highScoresMap = {};
  for (const entry of entries) {
    highScoresMap[entry.get("id")] = await findHighScores(entry);
  }
  return highScoresMap;
}

async function createEntryScore(userId, entryId) {
  const entryScore = new models.EntryScore({
    user_id: userId,
    entry_id: entryId,
  });
  await entryScore.load(["user"]);
  return entryScore;
}

async function findEntryScore(userId, entryId) {
  if (userId && entryId) {
    return models.EntryScore.where({
      user_id: userId,
      entry_id: entryId,
    })
      .fetch({ withRelated: ["user"] });
  } else {
    return null;
  }
}

async function findEntryScoreById(id, options: any = {}) {
  return models.EntryScore.where("id", id)
    .fetch({
      withRelated: options.withRelated || ["user"],
    });
}

/**
 * Retrieves all user scores
 */
async function findUserScores(userId, options: any = {}) {
  if (!userId) { return null; }

  let query = models.EntryScore.where("user_id", userId);
  switch (options.sortBy) {
    case "ranking":
      query = query.orderBy("ranking");
      break;
    case "updated_at":
      query = query.orderBy("updated_at", "DESC");
      break;
    default:
  }

  // PERF: Entry details required to format scores
  return query.fetchAll({ withRelated: options.related || ["entry.userRoles", "entry.details"] });
}

/**
 * Finds all scores submitted by a user to the specified entry array or collection
 */
async function findUserScoresMapByEntry(userId, entries) {
  if (!userId || !entries) { return null; }

  entries = entries.models || entries; // Accept collections or arrays

  const entriesToScore = {};
  const entryScores = await models.EntryScore
    .where("user_id", userId)
    .where("entry_id", "in", entries.map((entry) => entry.get("id")))
    .fetchAll({ withRelated: ["user"] });
  for (const entry of entries) {
    entriesToScore[entry.get("id")] = entryScores.find((score) => score.get("entry_id") === entry.get("id"));
  }
  return entriesToScore;
}

/**
 * Returns the date of the last submitted score for all the specified entries
 */
async function findEntriesLastActivity(entryIds) {
  const rows = await db.knex("entry_score")
    .select("entry_id")
    .max("updated_at as max_updated_at")
    .groupBy("entry_id")
    .where("entry_id", "in", entryIds);

  const entryIdToUpdatedAt = {};
  rows.forEach((row) => {
    entryIdToUpdatedAt[row.entry_id] = row.max_updated_at;
  });
  return entryIdToUpdatedAt;
}

/**
 * Finds the most recently active entry scores
 */
async function findRecentlyActiveEntries(options: { limit?: number, eventId?: number } = {}) {
  const entryScoreIds = await db.knex.select("entry_score.id")
    .from(function() {
      const qb = this.distinct("entry_score.entry_id")
        .max("entry_score.updated_at as max_updated_at")
        .from("entry_score");
      if (options.eventId) {
        qb.leftJoin("tournament_entry", "tournament_entry.entry_id", "entry_score.entry_id")
          .where("tournament_entry.event_id", options.eventId);
      }
      qb.groupBy("entry_score.entry_id")
        .orderBy("max_updated_at", "DESC")
        .limit(options.limit || 10)
        .as("active");
    })
    .innerJoin("entry_score", function() {
      this.on("entry_score.updated_at", "=", "active.max_updated_at")
        .andOn("entry_score.entry_id", "=", "active.entry_id");
    })
    .orderBy("active.max_updated_at", "DESC");

  return models.EntryScore
    .where("id", "IN", entryScoreIds.map((row) => row.id))
    .orderBy("updated_at", "DESC")
    .fetchAll({ withRelated: ["entry.details", "user"] }); // PERF: Entry details required to format scores
}

/**
 * @return any errors, or the updated entry score (ie. with the ranking set)
 */
async function submitEntryScore(entryScore, entry) {
  if (!entryScore || !entry) {
    return { error: "Internal error (missing score information)" };
  }
  if (entryScore.get("score") === 0) {
    return { error: "Invalid score" };
  }

  if (entry.get("status_high_score") !== enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
    if (entryScore.hasChanged()) {
      // Check ranking before accepting proof-less score
      if (!entryScore.get("proof")) {
        const higherScoreCount = await models.EntryScore
          .where("entry_id", entry.get("id"))
          .where("score", _rankingOperator(entry), entryScore.get("score"))
          .count();
        const ranking = parseInt(higherScoreCount, 10) + 1;
        if (ranking <= 10) {
          return { error: "Pic or it didn't happen! You need a screenshot to get in the Top 10 :)" };
        }
      }

      // Save score
      entryScore.set("active", true);
      await entryScore.save();

      // Refresh rankings
      const updatedEntryScore = await refreshEntryRankings(entry, entryScore);
      return updatedEntryScore || entryScore;
    } else {
      return entryScore;
    }
  } else {
    return { error: "High scores are disabled on this entry" };
  }
}

async function setEntryScoreActive(id, active) {
  const entryScore = await findEntryScoreById(id, { withRelated: ["entry.details"] });
  if (entryScore && entryScore.get("active") !== active) {
    entryScore.set("active", active);
    await entryScore.save();
    await refreshEntryRankings(entryScore.related("entry"), entryScore,
      { statusTournamentAllowed: [enums.EVENT.STATUS_TOURNAMENT.PLAYING, enums.EVENT.STATUS_TOURNAMENT.CLOSED] });
  }
}

async function deleteEntryScore(entryScore, entry) {
  if (!isExternalProof(entryScore)) {
    fileStorage.remove(entryScore.get("proof"));
  }
  const triggeringUserId = entryScore.get("user_id");
  await entryScore.destroy();
  await refreshEntryRankings(entry, null, { triggeringUserId });
}

async function deleteAllEntryScores(entry) {
  await db.knex("entry_score")
    .where("entry_id", entry.get("id"))
    .delete();
  await refreshEntryRankings(entry);
}

async function refreshEntryRankings(entry, triggeringEntryScore = null, options: any = {}) {
  let updatedEntryScore = null;
  const impactedEntryScores = [];

  const scores = await models.EntryScore
    .where("entry_id", entry.get("id"))
    .orderBy("score", _rankingDir(entry))
    .orderBy("updated_at")
    .fetchAll();

  await db.transaction(async (t) => {
    let ranking = 1;
    for (const score of scores.models) {
      if (score.get("ranking") !== ranking) {
        score.set("ranking", ranking);
        score.save(null, { transacting: t });
        if (score.get("active")) {
          impactedEntryScores.push(score);
        }
      }
      if (score.get("active")) {
        ranking++;
      }

      if (triggeringEntryScore && score.get("id") === triggeringEntryScore.get("id")) {
        updatedEntryScore = score;
      }
    }
  });

  // Update high score count
  const entryDetails = entry.related("details");
  if (entryDetails.get("high_score_count") !== scores.models.length) {
    await entryDetails.save({ high_score_count: scores.models.length }, { patch: true });
  }

  // Refresh active tournament scores
  const activeTournamentEvent = await eventTournamentService.findActiveTournamentPlaying(entry.get("id"), options);
  if (activeTournamentEvent) {
    const triggeringUserId = options.triggeringUserId || (triggeringEntryScore
        ? triggeringEntryScore.get("user_id") : null);
    eventTournamentService.refreshTournamentScores(module.exports.default, activeTournamentEvent,
      triggeringUserId, impactedEntryScores, options);
  }

  if (updatedEntryScore) {
    await updatedEntryScore.load(["user"]);
  }
  return updatedEntryScore;
}

function isExternalProof(entryScore) {
  return forms.isURL(entryScore.get("proof"));
}

function _rankingDir(entry) {
  return entry.get("status_high_score") === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? "ASC" : "DESC";
}

function _rankingOperator(entry) {
  return entry.get("status_high_score") === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? "<" : ">";
}
