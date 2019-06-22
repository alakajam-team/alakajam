
/**
 * Service for managing games ratings & rankings.
 *
 * @module services/event-rating-service
 */

import constants from "server/core/constants";
import db from "server/core/db";
import enums from "server/core/enums";
import forms from "server/core/forms";
import * as models from "server/core/models";
import settings from "server/core/settings";
import postService from "server/post/post.service";
import eventService from "../event.service";

export default {
  areVotesAllowed,
  canVoteInEvent,
  canVoteOnEntry,

  countEntryVotes,
  findEntryVote,
  saveEntryVote,

  findVoteHistory,
  findEntryRankings,

  refreshEntryRatings,
  refreshEntryKarma,
  computeKarmaReceivedByUser,
  computeKarmaGivenByUserAndEntry,
  computeKarma,

  computeRankings,
  clearRankings,
};

function areVotesAllowed(event) {
  return event &&
    [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE].includes(event.get("status_results"));
}

async function canVoteInEvent(user, event) {
  if (user && areVotesAllowed(event)) {
    return !!(await eventService.findUserEntryForEvent(user, event.get("id")));
  } else {
    return false;
  }
}

/**
 * Checks whether a user can vote on an entry
 * @param  {User} user
 * @param  {Entry} entry
 * @return {void}
 */
async function canVoteOnEntry(user, entry) {
  if (user && areVotesAllowed(entry.related("event"))) {
    const openVoting = await settings.find(constants.SETTING_EVENT_OPEN_VOTING, "false");
    if (openVoting && openVoting.toLowerCase() === "true") {
      return true;
    } else {
      const userEntry = await eventService.findUserEntryForEvent(user, entry.get("event_id"));
      return userEntry && userEntry.get("id") !== entry.get("id");
    }
  } else {
    return false;
  }
}

async function countEntryVotes(entry) {
  const result = await models.EntryVote
    .where("entry_id", entry.get("id"))
    .count();
  return parseInt(result, 10);
}

/**
 * Finds the votes an user cast on an entry
 * @param  {User} user
 * @param  {Entry} entry
 * @return {void}
 */
async function findEntryVote(user, entry) {
  return models.EntryVote.where({
    entry_id: entry.get("id"),
    user_id: user.get("id"),
  }).fetch();
}

/**
 * Saves the votes on an entry
 * @param  {User} user
 * @param  {Entry} entry
 * @param  {Event} event
 * @param  {array(number)} voteData
 * @return {void}
 */
async function saveEntryVote(user, entry, event, voteData: number[]) {
  await entry.load(["details", "event.details"]);
  const eventDetails = event.related("details");

  const expectedVoteCount = eventDetails.get("category_titles").length;
  if (voteData.length !== expectedVoteCount) {
    throw new Error("there must be information for exactly " + expectedVoteCount + " voting categories");
  }

  let vote = await findEntryVote(user, entry);
  if (!vote) {
    vote = new models.EntryVote({
      user_id: user.get("id"),
      entry_id: entry.get("id"),
      event_id: event.get("id"),
    });
  }

  let hasActualVote = false;
  const optouts = entry.related("details").get("optouts") || [];
  voteData.forEach((value, index) => {
    const categoryIndex = index + 1;
    if (!forms.isFloat(value, { min: 0, max: 10 }) ||
        optouts.includes(eventDetails.get("category_titles")[categoryIndex - 1])) {
      voteData[index] = 0;
    }

    vote.set("vote_" + categoryIndex, value || 0);
    hasActualVote = hasActualVote || value > 0;
  });

  let refreshRequired = true;
  if (hasActualVote) {
    if (vote.get("id")) {
      refreshRequired = false;
    }
    await vote.save();
  } else if (vote.get("id")) {
    await vote.destroy();
  }

  await refreshEntryRatings(entry);
  if (refreshRequired) {
    refreshEntryKarma(entry, event);

    const userEntry = await eventService.findUserEntryForEvent(user, event.get("id"));
    if (userEntry) {
      refreshEntryKarma(userEntry, event);
    }
  }
}

/**
 * Finds the votes a user cast during an event
 * @param  {integer} userId
 * @param  {Event} event
 * @param  {object} options allowed: pageSize withRelated
 * @return {void}
 */
async function findVoteHistory(userId, event, options: any = {}) {
  const query = models.EntryVote.where({
    user_id: userId,
    event_id: event.get("id"),
  })
    .orderBy("updated_at", "DESC");

  if (options.pageSize) {
    return query.fetchPage({
      pageSize: options.pageSize || 50,
      withRelated: options.withRelated || ["entry.userRoles"],
    });
  } else {
    return query.fetchAll({
      withRelated: options.withRelated || ["entry.userRoles"],
    });
  }
}

/**
 *
 * @param  {Event} event
 * @param  {number} categoryIndex
 * @return {Collection(Entry)}
 */
async function findEntryRankings(event, division, categoryIndex) {
  if (categoryIndex > 0 && categoryIndex <= constants.MAX_CATEGORY_COUNT) {
    return models.Entry.query((qb) => {
      return qb.leftJoin("entry_details", "entry_details.entry_id", "entry.id")
        .where({
          event_id: event.get("id"),
          division,
        })
        .whereNotNull("entry_details.ranking_" + categoryIndex)
        .orderBy("entry_details.ranking_" + categoryIndex)
        .orderBy("entry.id", "desc");
    }).fetchAll({ withRelated: ["userRoles", "details"] });
  } else {
    throw new Error("Invalid category index: " + categoryIndex);
  }
}

/**
 * Refreshes the average ratings for a given entry
 * @param  {Entry} entry
 * @return {void}
 */
async function refreshEntryRatings(entry) {
  await entry.load(["votes", "details", "event.details"]);
  const event = entry.related("event");
  const votes = entry.related("votes");

  const categoryCount = event.related("details").get("category_titles").length;

  const ratingCount = [];
  const ratingSum = [];

  const categoryIndexes = _range(1, categoryCount);
  for (const categoryIndex of categoryIndexes) {
    ratingCount[categoryIndex] = 0;
    ratingSum[categoryIndex] = 0;
  }

  votes.each((vote) => {
    for (const categoryIndex of categoryIndexes) {
      const rating = parseFloat(vote.get("vote_" + categoryIndex) || 0);
      if (rating !== 0) {
        ratingCount[categoryIndex]++;
        ratingSum[categoryIndex] += rating;
      }
    }
  });

  // Only give a rating if the entry has enough votes (tolerate being a bit under the minimum)
  const entryDetails = entry.related("details");
  const requiredRatings = Math.floor(0.8 * await settings.findNumber(
      constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, 1));
  for (const categoryIndex of categoryIndexes) {
    let averageRating;
    if (ratingCount[categoryIndex] >= requiredRatings) {
      averageRating = 1.0 * ratingSum[categoryIndex] / ratingCount[categoryIndex];
    } else {
      averageRating = null;
    }
    entryDetails.set("rating_" + categoryIndex, averageRating);
  }
  await entryDetails.save();
}

function _range(from, to) {
  return Array.from(new Array(to), (x, i) => i + from);
}

/**
 *
 * @param  {Entry} entry
 * @param  {Event} event
 * @param  {object} options (optional) force
 * @return {void}
 */
async function refreshEntryKarma(entry, event) {
  await entry.load(["details", "comments", "userRoles", "votes"]);
  const received = (await computeKarmaReceivedByUser(entry)).total;
  const given = (await computeKarmaGivenByUserAndEntry(entry, event)).total;
  await entry.save({ karma: computeKarma(received, given) }, { patch: true });

  const entryDetails = entry.related("details");
  await entryDetails.save({ rating_count: entry.related("votes").length }, { patch: true });
}

/* Compute received score */
async function computeKarmaReceivedByUser(entry) {
  const receivedByUser = {};
  for (const comment of entry.related("comments").models) {
    // Earn up to 3 points per user from comments
    const userId = comment.get("user_id");
    receivedByUser[userId] = receivedByUser[userId] || { commentKarma: 0 };
    receivedByUser[userId].commentKarma += comment.get("karma");
  }
  for (const vote of entry.related("votes").models) {
    // Earn 2 points per user from votes
    const userId = vote.get("user_id");
    receivedByUser[userId] = receivedByUser[userId] || {};
    receivedByUser[userId].voteKarma = 2;
  }

  const result = {
    receivedByUser,
    total: 0,
  };
  Object.keys(receivedByUser).forEach((userId) => {
    // Pick the highest score among comments & votes on each user
    result.total += Math.max(receivedByUser[userId].commentKarma || 0, receivedByUser[userId].voteKarma || 0);
  });
  return result;
}

/* Compute given score using comments & votes from all the team */
async function computeKarmaGivenByUserAndEntry(entry, event) {
  const givenByUserAndEntry = {};
  const userRoles = entry.related("userRoles");
  for (const userRole of userRoles.models) {
    // Earn up to 3 points per user from comments
    const userId = userRole.get("user_id");
    const givenComments = await postService.findCommentsByUserAndEvent(userId, event.get("id"));
    for (const givenComment of givenComments.models) {
      const key = userId + "_to_" + givenComment.get("node_id");
      givenByUserAndEntry[key] = givenByUserAndEntry[key] || {
        commentKarma: 0,
        userId,
        entryId: givenComment.get("node_id"),
      };
      givenByUserAndEntry[key].commentKarma += givenComment.get("karma");
    }

    // Earn 2 points per user from votes
    const votes = await findVoteHistory(userRole.get("user_id"), event);
    for (const vote of votes.models) {
      const key = vote.get("user_id") + "_to_" + vote.get("entry_id");
      givenByUserAndEntry[key] = givenByUserAndEntry[key] || {
        commentKarma: 0,
        userId: vote.get("user_id"),
        entryId: vote.get("entry_id"),
      };
      givenByUserAndEntry[key].voteKarma = 2;
    }
  }

  const result = {
    givenByUserAndEntry,
    total: 0,
  };
  Object.keys(givenByUserAndEntry).forEach((key) => {
    // Pick the highest score among comments & votes on each user
    result.total += Math.max(givenByUserAndEntry[key].commentKarma || 0, givenByUserAndEntry[key].voteKarma || 0);
  });

  return result;
}

function computeKarma(received, given) {
  // This formula boosts a little bit low scores (< 30) to ensure everybody gets at least some comments,
  // and to reward people for posting their first comments. It also nerfs & caps very active commenters to prevent
  // them from trusting the front page. Finally, negative scores are not cool so we use 100 as the origin.
  // NB. It is inspired by the actual LD sorting equation: D = 50 + R - 5*sqrt(min(C,100))
  // (except that here, higher is better)
  return Math.floor(Math.max(0, 74 + 8.5 * Math.sqrt(10 + Math.min(given, 100)) - received));
}

async function computeRankings(event) {
  const rankedDivisions = Object.keys(event.get("divisions"));
  if (rankedDivisions.length === 0) {
    return;
  }
  rankedDivisions.splice(rankedDivisions.indexOf(enums.DIVISION.UNRANKED), 1);

  const rankedEntries = await models.Entry
    .where("event_id", event.get("id"))
    .where("division", "<>", enums.DIVISION.UNRANKED)
    .fetchAll({
      withRelated: ["details", "votes"],
    });

  // For each ranking category...
  const categoryCount = event.related("details").get("category_titles").length;
  const categoryIndexes = _range(1, categoryCount);
  for (const categoryIndex of categoryIndexes) {
    const sortedEntries = rankedEntries.sortBy((entry) => -entry.related("details").get("rating_" + categoryIndex));

    // For each division...
    for (const division of rankedDivisions) {
      let rank = 1;
      let previousDetails = null;

      // For each entry, best to worst...
      const divisionEntries = sortedEntries.filter((entry) => entry.get("division") === division);
      for (const entry of divisionEntries) {
        const details = entry.related("details");

        // Rank it, if it has an average rating if the given category
        if (details.get("rating_" + categoryIndex) >= 1) {
          const tie = previousDetails &&
            previousDetails.get("rating_" + categoryIndex) === details.get("rating_" + categoryIndex);
          if (tie) {
            details.set("ranking_" + categoryIndex, previousDetails.get("ranking_" + categoryIndex));
          } else {
            details.set("ranking_" + categoryIndex, rank);
            previousDetails = details;
          }
          rank++;
        }
      }
    }
  }

  return db.transaction(async (transaction) => {
    for (const entry of rankedEntries.models) {
      await entry.related("details").save(null, { transacting: transaction });
    }
  });
}

async function clearRankings(event) {
  const entries = await models.Entry
    .where("entry.event_id", event.get("id"))
    .where("entry.division", "<>", enums.DIVISION.UNRANKED)
    .fetchAll({
      withRelated: ["details", "votes"],
    });

  const categoryCount = event.related("details").get("category_titles").length;
  const categoryIndexes = _range(1, categoryCount);

  return db.transaction(async (transaction) => {
    for (const entry of entries.models) {
      const entryDetails = entry.related("details");
      for (const categoryIndex of categoryIndexes) {
        entryDetails.set("ranking_" + categoryIndex, null);
      }
      await entryDetails.save(null, { transacting: transaction });
    }
  });
}
