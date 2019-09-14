
/**
 * Service for managing theme voting.
 *
 * @module services/event-theme-service
 */

import { Model, SaveOptions } from "bookshelf";
import * as moment from "moment";
import cache from "server/core/cache";
import { ilikeOperator } from "server/core/config";
import constants from "server/core/constants";
import db from "server/core/db";
import enums from "server/core/enums";
import forms from "server/core/forms";
import * as models from "server/core/models";
import settings from "server/core/settings";

export default {
  isThemeVotingAllowed,

  findThemeById,
  findThemeIdeasByUser,
  findThemesByTitle,
  saveThemeIdeas,

  findThemeVotesHistory,
  findThemesToVoteOn,
  findThemeShortlistVotes,
  saveVote,
  saveShortlistVotes,
  countShortlistVotes,

  findAllThemes,
  findBestThemes,
  findThemeRanking,
  findShortlist,
  computeShortlist,
  computeEliminatedShortlistThemes,
  computeNextShortlistEliminationTime,
};

async function isThemeVotingAllowed(event) {
  if (event.get("status") === enums.EVENT.STATUS.OPEN &&
    event.get("status_theme") === enums.EVENT.STATUS_THEME.VOTING) {
    const votingAllowedCacheKey = event.get("name") + "_event_voting_allowed_";
    if (cache.general.get(votingAllowedCacheKey) === undefined) {
      const themeIdeasRequired = await settings.findNumber(
        constants.SETTING_EVENT_THEME_IDEAS_REQUIRED, 10);
      const themeIdeaCount = await models.Theme.where({
        event_id: event.get("id"),
      }).count();
      cache.general.set(votingAllowedCacheKey, themeIdeaCount >= themeIdeasRequired);
    }
    return cache.general.get(votingAllowedCacheKey);
  } else {
    return false;
  }
}

async function findThemeById(id) {
  return models.Theme.where("id", id).fetch();
}

/**
 * Saves the theme ideas of an user for an event
 * @param user {User} user model
 * @param event {Event} event model
 * @param ideas {array(object)} An array of exactly 3 ideas (all fields optional): [{label, id}]
 */
async function findThemeIdeasByUser(user, event) {
  return models.Theme.where({
    user_id: user.get("id"),
    event_id: event.get("id"),
  })
    .orderBy("id")
    .fetchAll();
}

async function findThemesByTitle(title: string, fetchOptions = {}): Promise<Array<Model<any>>> {
  return models.Theme.where("title", ilikeOperator(), title)
    .orderBy("created_at")
    .fetchAll(fetchOptions);
}

/**
 * Saves the theme ideas of an user for an event
 * @param user {User} user model
 * @param event {Event} event model
 * @param ideas {array(object)} An array of exactly 3 ideas: [{title, id}]. Not filling the title
 * deletes the idea, not filling the ID creates one instead of updating it.
 */
async function saveThemeIdeas(user, event, ideas) {
  const ideasToKeep = [];
  const ideasToCreate = [];
  const themesToDelete = [];

  // Compare form with the existing user themes
  const existingThemes = await findThemeIdeasByUser(user, event);
  for (const existingTheme of existingThemes.models) {
    const ideaFound = ideas.find((idea) => parseInt(idea.id, 10) === existingTheme.get("id"));
    if (!ideaFound || ideaFound.title !== existingTheme.get("title")) {
      if (existingTheme.get("status") === enums.THEME.STATUS.ACTIVE ||
          existingTheme.get("status") === enums.THEME.STATUS.DUPLICATE) {
        themesToDelete.push(existingTheme);
      }
    } else {
      ideasToKeep.push(ideaFound);
    }
  }
  for (const idea of ideas) {
    if (!ideasToKeep.includes(idea) && idea.title) {
      ideasToCreate.push(idea);
    }
  }

  // Delete obsolete themes
  const tasks = [];
  let ideasSubmitted = existingThemes.models.length - themesToDelete.length;
  for (const themeToDelete of themesToDelete) {
    tasks.push(themeToDelete.destroy());
  }
  await Promise.all(tasks);

  // Create themes
  const maxThemeSuggestions = await settings.findNumber(constants.SETTING_EVENT_THEME_SUGGESTIONS, 3);
  for (const idea of ideasToCreate) {
    if (ideasSubmitted < maxThemeSuggestions) {
      const theme = new models.Theme({
        user_id: user.get("id"),
        event_id: event.get("id"),
        title: idea.title,
        status: enums.THEME.STATUS.ACTIVE,
      });
      await _handleDuplicates(theme);
      await theme.save();
      ideasSubmitted++;
    } else {
      break;
    }
  }

  _refreshEventThemeStats(event);
}

/**
 * Sets the theme status to "duplicate" if another theme is identical
 */
async function _handleDuplicates(theme) {
  theme.set("slug", forms.slug(theme.get("title")));

  let query = models.Theme.where({
    slug: theme.get("slug"),
    event_id: theme.get("event_id"),
  });
  if (theme.get("id")) {
    query = query.where("id", "<>", theme.get("id"));
  }
  if ((await query.fetch()) !== null) {
    theme.set("status", enums.THEME.STATUS.DUPLICATE);
  }
}

/**
 * Returns the 30 latest votes by the user
 * @param user {User} user model
 * @param event {Event} event model
 * @param options {object} (optional) count
 */
async function findThemeVotesHistory(user, event, options: any = {}) {
  const query = models.ThemeVote.where({
    event_id: event.get("id"),
    user_id: user.get("id"),
  });
  if (options.count) {
    return query.count();
  } else {
    return query.orderBy("id", "DESC")
      .fetchPage({
        pageSize: 30,
        withRelated: ["theme"],
      });
  }
}

/**
 * Returns a page of 10 themes that a user can vote on
 * @param user {User} (optional) user model
 * @param event {Event} event model
 */
async function findThemesToVoteOn(user, event) {
  let query = models.Theme;
  if (user) {
    query = query.query((qb) => {
      qb.leftOuterJoin("theme_vote", function() {
        this.on("theme.id", "=", "theme_vote.theme_id");
        this.andOn("theme_vote.user_id", "=", user.get("id"));
      });
    })
      .where({
        "status": enums.THEME.STATUS.ACTIVE,
        "theme.event_id": event.get("id"),
        "theme_vote.user_id": null,
      })
      .where("theme.user_id", "<>", user.get("id"));
  } else {
    query = query.where("event_id", event.get("id"))
      .where("status", "IN", [enums.THEME.STATUS.ACTIVE, enums.THEME.STATUS.SHORTLIST]);
  }
  const themesCollection = await query.orderBy("updated_at")
    .fetchPage({ pageSize: 20 });

  if (themesCollection.length >= 5) {
    // Grab the 20 oldest theme ideas, then just keep the 10 with the least notes.
    // This helps new themes catch up with the pack fast, while being much better randomized
    // than just showing the themes with the least notes.
    const sortedThemes = themesCollection.sortBy((theme) => theme.get("notes"));
    const themesToVoteOn = sortedThemes.splice(0, 10);
    const shuffledThemes = new db.Collection(themesToVoteOn).shuffle();
    return new db.Collection(shuffledThemes);
  } else {
    // Only serve themes in batches, otherwise it gives away when a person submitted its 3 themes
    return new db.Collection();
  }
}

async function findThemeShortlistVotes(user, event) {
  const shortlistCollection = await findShortlist(event);
  const shortlistIds = [];
  shortlistCollection.each((theme) => shortlistIds.push(theme.get("id")));
  return models.ThemeVote.where({
    user_id: user.get("id"),
  })
    .where("theme_id", "IN", shortlistIds)
    .fetchAll();
}

/**
 * Saves a theme vote
 * @param user {User} user model
 * @param event {Event} event model
 * @param themeId {integer}
 * @param score {integer}
 * @param options {object} doNotSave
 */
async function saveVote(user, event, themeId, score, options: any = {}) {
  let voteCreated = false;
  let expectedStatus = null;
  let result = {};

  if (event.get("status_theme") === enums.EVENT.STATUS_THEME.VOTING && [-1, 1].indexOf(score) !== -1) {
    expectedStatus = enums.THEME.STATUS.ACTIVE;
  } else if (event.get("status_theme") === enums.EVENT.STATUS_THEME.SHORTLIST && score >= 1 && score <= 10) {
    expectedStatus = enums.THEME.STATUS.SHORTLIST;
  }

  if (expectedStatus) {
    const theme = await models.Theme.where("id", themeId).fetch();

    if (theme.get("status") === expectedStatus) {
      let vote = await models.ThemeVote.where({
        user_id: user.get("id"),
        event_id: event.get("id"),
        theme_id: themeId,
      }).fetch();

      if (vote) {
        theme.set("score", theme.get("score") + score - (vote.get("score") || 0));
        vote.set("score", score);
      } else {
        theme.set({
          score: theme.get("score") + score,
          notes: theme.get("notes") + 1,
        });
        vote = new models.ThemeVote({
          theme_id: themeId,
          user_id: user.get("id"),
          event_id: event.get("id"),
          score,
        });
        voteCreated = true;
      }

      const positiveVotes = (theme.get("notes") + theme.get("score")) / 2.0;
      const wilsonBounds = computeWilsonBounds(positiveVotes, theme.get("notes"));
      theme.set({
        rating_elimination: wilsonBounds.high,
        rating_shortlist: wilsonBounds.low,
        normalized_score: 1.0 * theme.get("score") / theme.get("notes"),
      });

      result = {
        theme,
        vote,
      };
      if (!options.doNotSave) {
        await Promise.all([theme.save(), vote.save()]);
      }
    }
  }

  if (expectedStatus === enums.THEME.STATUS.ACTIVE && voteCreated) {
    // Eliminate lowest themes every x votes. No need for DB calls, just count in-memory
    const eliminationThreshold = await settings.findNumber(
      constants.SETTING_EVENT_THEME_ELIMINATION_MODULO, 10);
    let uptimeVotes: number = cache.general.get("uptime_votes") || 0;
    if (uptimeVotes % eliminationThreshold === 0) {
      _eliminateLowestThemes(event);
    }
    _refreshEventThemeStats(event);

    uptimeVotes++;
    cache.general.set("uptime_votes", uptimeVotes);
  }

  return result;
}

function computeWilsonBounds(positive, total) {
  if (total === 0) {
    return { low: 0, high: 1 };
  } else {
    // Equation source: http://www.evanmiller.org/how-not-to-sort-by-average-rating.html
    const z = 3.0;
    const phat = 1.0 * positive / total;
    const zsqbyn = z * z / total;
    const uncertainty = z * Math.sqrt((phat * (1 - phat) + zsqbyn / 4) / total);
    return {
      low: (phat + zsqbyn / 2 - uncertainty) / (1 + zsqbyn),
      high: (phat + zsqbyn / 2 + uncertainty) / (1 + zsqbyn),
    };
  }
}

async function _eliminateLowestThemes(event) {
  const eliminationMinNotes = await settings.findNumber(
    constants.SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, 5);
  const eliminationThreshold = await settings.findNumber(
    constants.SETTING_EVENT_THEME_ELIMINATION_THRESHOLD, 0.58);

  const battleReadyThemesQuery = await models.Theme.where({
    event_id: event.get("id"),
    status: enums.THEME.STATUS.ACTIVE,
  })
    .where("notes", ">=", eliminationMinNotes);

  // Make sure we have at least enough themes to fill our shortlist before removing some
  const battleReadyThemeCount = await battleReadyThemesQuery.count();
  if (battleReadyThemeCount > constants.SHORTLIST_SIZE) {
    const loserThemes = await models.Theme.where({
      event_id: event.get("id"),
      status: enums.THEME.STATUS.ACTIVE,
    })
      .where("notes", ">=", eliminationMinNotes)
      .where("rating_elimination", "<", eliminationThreshold)
      .orderBy("rating_elimination")
      .orderBy("created_at", "desc")
      .fetchAll();

    await event.load("details");
    const eliminatedThemes = loserThemes.slice(0,
      Math.min(battleReadyThemeCount - constants.SHORTLIST_SIZE, loserThemes.length));
    for (const eliminatedTheme of eliminatedThemes) {
      await _eliminateTheme(eliminatedTheme, event.related("details"));
    }
  }
}

async function _eliminateTheme(
    theme: Model<any>,
    eventDetails: Model<any>,
    options: { eliminatedOnShortlistRating?: boolean } & SaveOptions = {}): Promise<void> {
  // Compute ranking as %-age because new submissions would make this number irrelevant
  const themeRanking = await findThemeRanking(theme, { useShortlistRating: options.eliminatedOnShortlistRating });
  const rankingPercent = 1.0 * themeRanking / (eventDetails.get("theme_count") || 1);

  theme.set({
    status: enums.THEME.STATUS.OUT,
    ranking: rankingPercent
  });
  await theme.save(null, options);
}

async function saveShortlistVotes(user, event, ids) {
  const shortlistCollection = await findShortlist(event);
  const sortedShortlist = shortlistCollection.sortBy((theme) => {
    return ids.indexOf(theme.get("id"));
  });

  let score = constants.SHORTLIST_SIZE;
  const results = [];
  for (const theme of sortedShortlist) {
    results.push(await saveVote(user, event, theme.get("id"), score, { doNotSave: true }));
    score--;
  }

  await db.transaction(async (transaction) => {
    const saveOptions = { transacting: transaction };
    for (const result of results) {
      if (result.theme) { await result.theme.save(null, saveOptions); }
      if (result.vote) { await result.vote.save(null, saveOptions); }
    }
  });
}

async function countShortlistVotes(event) {
  return cache.getOrFetch(cache.general, "shortlist_votes_" + event.get("name"),
    async () => {
      return models.ThemeVote
        .where({
          event_id: event.get("id"),
          score: 9,
        })
        .count();
    }, 10 * 60 /* 10 min TTL */);
}

async function findAllThemes(event, options: any = {}) {
  let query = models.Theme.where("event_id", event.get("id"));
  if (options.shortlistEligible) {
    query = query.where("status", "<>", enums.THEME.STATUS.OUT)
      .where("status", "<>", enums.THEME.STATUS.BANNED);
  }
  return query.orderBy("normalized_score", "DESC")
    .orderBy("created_at")
    .fetchAll();
}

async function findBestThemes(event) {
  const eliminationMinNotes = await settings.findNumber(constants.SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, 5);
  return models.Theme.where({
    event_id: event.get("id"),
  })
    .where("status", "<>", enums.THEME.STATUS.BANNED)
    .where("notes", ">=", eliminationMinNotes)
    .orderBy("rating_shortlist", "DESC")
    .orderBy("created_at")
    .fetchPage({ pageSize: constants.SHORTLIST_SIZE });
}

async function findThemeRanking(
    theme: Model<any>,
    options: { useShortlistRating?: boolean } = {}): Promise<number> {
  let betterThemeQuery = models.Theme.where("event_id", theme.get("event_id"));

  if (theme.get("status") === enums.THEME.STATUS.SHORTLIST) {
    betterThemeQuery = betterThemeQuery.where("score", ">", theme.get("score"));
  } else if (parseFloat(theme.get("rating_shortlist")) === 0 && parseFloat(theme.get("rating_elimination")) === 1) {
    // Retro-compatibility with old system
    betterThemeQuery = betterThemeQuery.where("normalized_score", ">", theme.get("normalized_score"));
  } else if (options.useShortlistRating) {
    betterThemeQuery = betterThemeQuery.where("rating_shortlist", ">", theme.get("rating_shortlist"));
  } else {
    betterThemeQuery = betterThemeQuery.where("rating_elimination", ">", theme.get("rating_elimination"));
  }

  const betterThemeCount = await betterThemeQuery.count(null, options);
  return parseInt(betterThemeCount, 10) + 1;
}

/**
 * Retrieves the theme shortlist sorted from best to worst
 * @param event Event
 */
async function findShortlist(event) {
  return models.Theme.where({
    event_id: event.get("id"),
    status: "shortlist",
  })
    .orderBy("score", "DESC")
    .fetchAll();
}

async function computeShortlist(event) {
  // Mark all themes as out
  const allThemesCollection = await findAllThemes(event, { shortlistEligible: true });
  await event.load("details");
  await db.transaction(async (transaction) => {
    for (const theme of allThemesCollection.models) {
      await _eliminateTheme(theme, event.related("details"),
        { eliminatedOnShortlistRating: true, transacting: transaction });
    }
  });

  // Compute new shortlist
  const bestThemeCollection = await findBestThemes(event);
  await db.transaction(async (transaction) => {
    for (const theme of bestThemeCollection.models) {
      theme.set("status", enums.THEME.STATUS.SHORTLIST);
      await theme.save(null, { transacting: transaction });
    }
  });
}

async function _refreshEventThemeStats(event) {
  await event.load("details");
  const eventDetails = event.related("details");

  // Throttled: updates every 5 seconds max
  if (eventDetails.get("updated_at") < new Date().getTime() - 5000) {
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
    eventDetails.save();
  }

  if (!(await isThemeVotingAllowed(event))) {
    cache.general.del(event.get("name") + "_event_voting_allowed_");
  }
}

/**
 * Live elimination of the theme shortlist in the moments leading to the jam
 * @param event Event with loaded details
 * @return number of eliminated themes
 */
function computeEliminatedShortlistThemes(event) {
  let eliminated = 0;

  const shortlistEliminationInfo = event.related("details").get("shortlist_elimination");
  if (shortlistEliminationInfo.start && shortlistEliminationInfo.delay
      && parseInt(shortlistEliminationInfo.delay, 10) > 0) {
    const delay = parseInt(shortlistEliminationInfo.delay, 10);
    const eliminationDate = moment(shortlistEliminationInfo.start);
    const now = moment();

    // We can eliminate at most 7 themes (leaving 3 until the reveal)
    while (eliminationDate.isBefore(now) && eliminated < 7) {
      eliminationDate.add(delay, "minutes");
      eliminated++;
    }
  }

  return eliminated;
}

/**
 * @param event Event with loaded details
 * @return moment time
 */
function computeNextShortlistEliminationTime(event) {
  let alreadyEliminated = 0;

  const shortlistEliminationInfo = event.related("details").get("shortlist_elimination");
  if (shortlistEliminationInfo.start) {
    const nextEliminationDate = moment(shortlistEliminationInfo.start);
    const now = moment();

    if (now.isBefore(nextEliminationDate)) {
      return nextEliminationDate;
    } else if (shortlistEliminationInfo.delay && parseInt(shortlistEliminationInfo.delay, 10) > 0) {
      const delay = parseInt(shortlistEliminationInfo.delay, 10);

      // We can eliminate at most 7 themes (leaving 3 until the reveal)
      while (nextEliminationDate.isBefore(now) && alreadyEliminated < 7) {
        nextEliminationDate.add(delay, "minutes");
        alreadyEliminated++;
      }

      if (alreadyEliminated < 7) {
        return nextEliminationDate;
      }
    }
  }

  return null;
}
