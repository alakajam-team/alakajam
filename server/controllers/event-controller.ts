
/**
 * Event pages
 *
 * @module controllers/event-controller
 */

import templating from "../controllers/templating";
import cache from "../core/cache";
import constants from "../core/constants";
import enums from "../core/enums";
import fileStorage from "../core/file-storage";
import forms from "../core/forms";
import log from "../core/log";
import eventRatingService from "../services/event-rating-service";
import eventService from "../services/event-service";
import eventThemeService from "../services/event-theme-service";
import eventTournamentService from "../services/event-tournament-service";
import highScoreService from "../services/highscore-service";
import likeService from "../services/like-service";
import platformService from "../services/platform-service";
import postService from "../services/post-service";
import securityService from "../services/security-service";
import settingService from "../services/setting-service";
import tagService from "../services/tag-service";
import userService from "../services/user-service";

export default {
  handleEventUserShortcuts,
  handleGameSearch,

  eventMiddleware,

  viewDefaultPage,
  viewEventAnnouncements,
  viewEventPosts,
  viewEventThemes,
  viewEventGames,
  viewEventRatings,
  viewEventResults,

  viewEventTournamentGames,
  submitTournamentGame,
  viewEventTournamentLeaderboard,

  pickEventTemplate,
  editEvent,
  editEventThemes,
  editEventEntries,
  editEventTournamentGames,
  deleteEvent,

  ajaxFindThemes,
  ajaxSaveVote,
};

/**
 * Fetches the event & optionally the user's entry
 */
async function eventMiddleware(req, res, next) {
  if (req.baseUrl.indexOf("/external-entry") !== 0) {
    const event = await eventService.findEventByName(req.params.eventName);
    res.locals.event = event;
    if (!event) {
      res.errorPage(404, "Event not found");
      return;
    } else {
      if (!res.locals.pageTitle) {
        res.locals.pageTitle = event.get("title");
        res.locals.pageDescription = "An Alakajam! event. Dates: " + event.get("display_dates") + ".";
        if (event.get("display_theme")) {
          res.locals.pageDescription += " Theme: " + event.get("display_theme");
        }
      }

      const announcementTask = postService.findLatestAnnouncement({ eventId: event.id })
        .then((announcement) => { res.locals.latestEventAnnouncement = announcement; });
      const userShortcutTasks = handleEventUserShortcuts(res, res.locals.event);

      await Promise.all([announcementTask, userShortcutTasks]);
    }
  }
  next();
}

function handleEventUserShortcuts(res, targetEvent) {
  if (targetEvent && res.locals.user) {
    let entryTask: any = true;
    let userPostTask: any = true;

    entryTask = eventService.findUserEntryForEvent(res.locals.user, targetEvent.get("id"))
      .then((userEntry) => { res.locals.userEntry = userEntry; });
    userPostTask = postService.findPost({
      userId: res.locals.user.id,
      eventId: targetEvent.id,
      specialPostType: null,
    })
      .then((userPost) => { res.locals.userPost = userPost; });

    return Promise.all([entryTask, userPostTask]);
  }
}

/**
 * Fills a searchOptions object according to the request GET parameters
 * @param  {Request} req
 * @param  {object} searchOptions initial search options
 * @return {object} search options
 */
async function handleGameSearch(req, res, searchOptions: any = {}) {
  // Pagination
  searchOptions.pageSize = 20;
  searchOptions.page = 1;
  if (forms.isId(req.query.p)) {
    searchOptions.page = parseInt(req.query.p, 10);
  }

  // Text search
  searchOptions.search = forms.sanitizeString(req.query.search);

  // User search
  if (forms.isId(req.query.user)) {
    searchOptions.userId = parseInt(req.query.user, 10);
    searchOptions.user = await userService.findById(searchOptions.userId);
  }

  // Division
  if (req.query.divisions) {
    if (typeof req.query.divisions === "string") {
      req.query.divisions = [req.query.divisions];
    }
    searchOptions.divisions = req.query.divisions.map(forms.sanitizeString);

    // Hack for Kajam's ranked division
    if (searchOptions.divisions.includes(enums.DIVISION.SOLO) ||
        searchOptions.divisions.includes(enums.DIVISION.TEAM)) {
      searchOptions.divisions.push(enums.DIVISION.RANKED);
    }
  }
  if (searchOptions.divisions && searchOptions.divisions.length === Object.keys(enums.DIVISION).length) {
    searchOptions.divisions = undefined;
  }

  // Platforms
  if (req.query.platforms) {
    let platforms = (Array.isArray(req.query.platforms)) ? req.query.platforms : [req.query.platforms];
    platforms = platforms.map((str) => parseInt(str, 10));
    if (platforms.includes(NaN)) {
      platforms = [];
      log.error("Invalid platform query: " + req.query.platforms);
    }
    searchOptions.platforms = platforms;
  }

  // Tags
  if (req.query.tags) {
    let tagIds = (Array.isArray(req.query.tags)) ? req.query.tags : [req.query.tags];
    tagIds = tagIds.map((str) => parseInt(str, 10));
    if (tagIds.includes(NaN)) {
      tagIds = [];
      log.error("Invalid tag query: " + req.query.tags);
    }
    const tagCollection = await tagService.fetchByIds(tagIds);
    searchOptions.tags = tagCollection.map((tag) => ({ id: tag.get("id"), value: tag.get("value") }));
  }

  // Event
  if (req.query.eventId === "none") {
    searchOptions.eventId = null;
  } else if (forms.isId(req.query.eventId)) {
    searchOptions.eventId = req.query.eventId;
  } else if (req.query.eventId === undefined && res.locals.event) {
    searchOptions.eventId = res.locals.event.get("id");
  } else if (req.query.eventId === undefined && res.locals.featuredEvent &&
      [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE]
        .includes(res.locals.featuredEvent.get("status_results"))) {
    searchOptions.eventId = res.locals.featuredEvent.get("id");
  } else {
    searchOptions.sortByRating = true;
  }

  // Hide rated/commented
  if (req.query.hideReviewed && res.locals.user) {
    searchOptions.notReviewedById = res.locals.user.get("id");
  }

  // High scores
  if (req.query.highScoresSupport) {
    searchOptions.highScoresSupport = true;
  }

  return searchOptions;
}

/**
 * Root event page, redirects to its entries
 */
async function viewDefaultPage(req, res) {
  const { event } = res.locals;

  let page;
  if (![enums.EVENT.STATUS_TOURNAMENT.OFF, enums.EVENT.STATUS_TOURNAMENT.DISABLED]
      .includes(event.get("status_tournament"))) {
    if (event.get("status_tournament") === enums.EVENT.STATUS_TOURNAMENT.RESULTS) {
      page = "tournament-leaderboard";
    } else {
      page = "tournament-games";
    }
  } else if (event.get("status_entry") !== enums.EVENT.STATUS_ENTRY.OFF) {
    if (event.get("status_results") === enums.EVENT.STATUS_RESULTS.RESULTS) {
      page = "results";
    } else {
      page = "games";
    }
  } else {
    page = "announcements";
  }

  res.redirect(templating.buildUrl(res.locals.event, "event", page));
}

/**
 * Browse event announcements
 */
async function viewEventAnnouncements(req, res) {
  res.locals.pageTitle += " | Announcements";

  const posts = await postService.findPosts({
    eventId: res.locals.event.get("id"),
    specialPostType: "announcement",
  });

  res.render("event/view-event-announcements", {
    posts,
    userLikes: await likeService.findUserLikeInfo(posts, res.locals.user),
  });
}

/**
 * Browse event posts
 */
async function viewEventPosts(_, res) {
  res.locals.pageTitle += " | Posts";

  const postsCollection = await postService.findPosts({
    eventId: res.locals.event.get("id"),
  });
  await postsCollection.load(["entry", "event"]);

  res.render("event/view-event-posts", {
    posts: postsCollection.models,
    pageCount: postsCollection.pagination.pageCount,
    userLikes: await likeService.findUserLikeInfo(postsCollection, res.locals.user),
  });
}

/**
 * Browse event theme voting
 */
async function viewEventThemes(req, res) {
  res.locals.pageTitle += " | Themes";

  const event = res.locals.event;

  const statusThemes = event.get("status_theme");
  if ([enums.EVENT.STATUS_THEME.DISABLED, enums.EVENT.STATUS_THEME.OFF].includes(statusThemes)) {
    res.errorPage(404);
  } else {
    let context: any = {
      maxThemeSuggestions: await settingService.findNumber(
        constants.SETTING_EVENT_THEME_SUGGESTIONS, 3),
      eliminationMinNotes: await settingService.findNumber(
        constants.SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, 5),
      infoMessage: null,
    };

    if (forms.isId(statusThemes)) {
      context.themesPost = await postService.findPostById(statusThemes);
      context.userLikes = await likeService.findUserLikeInfo([context.themesPost], res.locals.user);
    } else {
      if (req.method === "POST" && res.locals.user) {
        if (req.body.action === "ideas") {
          // Gather ideas data
          const ideas = [];
          for (let i = 0; i < parseInt(req.body["idea-rows"], 10); i++) {
            const idField = req.body["idea-id[" + i + "]"];
            if (forms.isId(idField) || !idField) {
              ideas.push({
                id: idField,
                title: forms.sanitizeString(req.body["idea-title[" + i + "]"]),
              });
            }
          }
          // Update theme ideas
          await eventThemeService.saveThemeIdeas(res.locals.user, event, ideas);
        } else if (req.body.action === "vote") {
          if (forms.isId(req.body["theme-id"]) && (req.body.upvote !== undefined || req.body.downvote !== undefined)) {
            const score = (req.body.upvote !== undefined) ? 1 : -1;
            await eventThemeService.saveVote(res.locals.user, event, parseInt(req.body["theme-id"], 10), score);
          }
        } else if (req.body.action === "shortlist" && req.body["shortlist-votes"]) {
          const ids = req.body["shortlist-votes"].split(",").map((id) => parseInt(id, 10));
          let validIds = true;
          for (const id of ids) {
            if (!forms.isId(id)) {
              validIds = false;
            }
          }
          if (validIds) {
            await eventThemeService.saveShortlistVotes(res.locals.user, event, ids);
            context.infoMessage = "Ranking changes saved.";
          }
        }
      }

      // Gather info for display
      const statusTheme = event.get("status_theme");

      if (res.locals.user) {
        // Logged users
        const userThemesCollection = await eventThemeService.findThemeIdeasByUser(res.locals.user, event);
        context.userThemes = userThemesCollection.models;

        context.voteCount = await eventThemeService.findThemeVotesHistory(
          res.locals.user, event, { count: true });

        if (statusTheme === enums.EVENT.STATUS_THEME.VOTING) {
          if (await eventThemeService.isThemeVotingAllowed(event)) {
            const votesHistoryCollection = await eventThemeService.findThemeVotesHistory(res.locals.user, event);
            context.votesHistory = votesHistoryCollection.models;
            context.votingAllowed = true;
          } else {
            context.ideasRequired = await settingService.find(constants.SETTING_EVENT_THEME_IDEAS_REQUIRED, "10");
            context.votingAllowed = false;
          }
        } else if ([enums.EVENT.STATUS_THEME.SHORTLIST, enums.EVENT.STATUS_THEME.CLOSED].includes(statusTheme)) {
          context = Object.assign(context, await _generateShortlistInfo(event, res.locals.user));
        }
      } else {
        // Anonymous users
        if (event.get("status_theme") === enums.EVENT.STATUS_THEME.VOTING) {
          if (await eventThemeService.isThemeVotingAllowed(event)) {
            const sampleThemesCollection = await eventThemeService.findThemesToVoteOn(null, event);
            context.sampleThemes = sampleThemesCollection.models;
            context.votingAllowed = true;
          } else {
            context.ideasRequired = await settingService.findNumber(constants.SETTING_EVENT_THEME_IDEAS_REQUIRED, 10);
            context.votingAllowed = false;
          }
        } else if ([enums.EVENT.STATUS_THEME.SHORTLIST, enums.EVENT.STATUS_THEME.CLOSED].includes(statusTheme)) {
          context = Object.assign(context, await _generateShortlistInfo(event));
        }
      }

      // State-specific data
      if ([enums.EVENT.STATUS_THEME.SHORTLIST, enums.EVENT.STATUS_THEME.CLOSED,
          enums.EVENT.STATUS_THEME.RESULTS].includes(statusTheme)) {
        context.shortlistVotes = await eventThemeService.countShortlistVotes(event);
      }
      if (statusTheme === enums.EVENT.STATUS_THEME.RESULTS) {
        let shortlistCollection = await eventThemeService.findShortlist(event);
        if (shortlistCollection.length === 0) {
          // In case the shortlist phase has been skipped
          shortlistCollection = await eventThemeService.findBestThemes(event);
        }
        context.shortlist = shortlistCollection.sortBy((theme) => -theme.get("score"));

        if (res.locals.user) {
          const shortlistVotesCollection = await eventThemeService.findThemeShortlistVotes(res.locals.user, event);
          if (shortlistVotesCollection.length === shortlistCollection.length) {
            context.userRanks = {};
            shortlistVotesCollection.each((vote) => {
              context.userRanks[vote.get("theme_id")] = 11 - parseInt(vote.get("score"), 10);
            });
          }
        }
      }

      await event.load("details");
    }

    res.render("event/view-event-themes", context);
  }
}

/**
 * Builds an object filled with data related to the theme shortlist:
 * @returns
 * {
 *  activeShortlist: The themes of the shortlist that aren't eliminated by the final countdown.
 *                   If a user has rated them, they are sorted by his ratings.
 *  eliminatedShortlist: The themes of the shortlist that are eliminated by the final countdown
 *  randomizedShortlist: true/false whether the shortlist is randomized
 *  hasRankedShortlist: true/false whether the user has ranked the shortlist
 *  scoreByTheme: (optional) The scores set by the user
 * }
 */
async function _generateShortlistInfo(event, user = null) {
  const shortlistCollection = await eventThemeService.findShortlist(event);
  const eliminatedShortlistThemes = eventThemeService.computeEliminatedShortlistThemes(event);

  // Split shortlist
  const info: any = {
    activeShortlist: shortlistCollection.slice(0, shortlistCollection.length - eliminatedShortlistThemes),
    eliminatedShortlist: eliminatedShortlistThemes > 0 ? shortlistCollection.slice(-eliminatedShortlistThemes) : [],
    randomizedShortlist: false,
    hasRankedShortlist: false,
  };

  // Sort active shortlist by user score
  const shortlistVotesCollection = user ? await eventThemeService.findThemeShortlistVotes(user, event) : null;
  if (shortlistVotesCollection) {
    info.scoreByTheme = {};
    shortlistVotesCollection.each((vote) => {
      info.scoreByTheme[vote.get("theme_id")] = vote.get("score");
      if (vote.get("score") === 9) {
        info.hasRankedShortlist = true;
      }
    });
    info.activeShortlist.sort((t1, t2) => {
      return (info.scoreByTheme[t2.get("id")] || 0) - (info.scoreByTheme[t1.get("id")] || 0);
    });
  }

  // Randomize active shortlist if no vote or anonymous
  if (!shortlistVotesCollection || shortlistVotesCollection.length === 0) {
    info.activeShortlist = shortlistCollection
      .chain()
      .slice(0, shortlistCollection.length - eliminatedShortlistThemes)
      .shuffle()
      .value();
    info.randomizedShortlist = true;
  }

  return info;
}

/**
 * Browse event games
 */
async function viewEventGames(req, res) {
  res.locals.pageTitle += " | Games";

  const { user, event } = res.locals;
  if (event.get("status_entry") === enums.EVENT.STATUS_ENTRY.OFF) {
    res.errorPage(404);
    return;
  }

  // Search form & pagination
  const searchOptions = await handleGameSearch(req, res, {
    eventId: event.get("id"),
  });

  // Search entries
  let rescueEntries = [];
  if (event.get("status_results") === "voting_rescue") {
    const canVoteInEvent = await eventRatingService.canVoteInEvent(user, event);
    if (canVoteInEvent || securityService.isMod(user)) {
      rescueEntries = (await eventService.findRescueEntries(event, user)).models;
    }
  }
  const requiredVotes = await settingService.findNumber(constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, 10);
  const entriesCollection = await eventService.findGames(searchOptions);
  const platformCollection = await platformService.fetchAll();

  // Fetch vote history
  let voteHistory = [];
  if (user && [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE,
    enums.EVENT.STATUS_RESULTS.RESULTS].includes(event.get("status_results"))) {
    const voteHistoryCollection = await eventRatingService.findVoteHistory(user.get("id"), event, { pageSize: 5 });
    voteHistory = voteHistoryCollection.models;
  }

  res.render("event/view-event-games", {
    rescueEntries,
    requiredVotes,
    entriesCollection,
    voteHistory,
    searchOptions,
    platforms: platformCollection.models,
  });
}

/**
 * Browse ratings by own user
 */
async function viewEventRatings(req, res) {
  res.locals.pageTitle += " | Ratings";

  const { user, event } = res.locals;

  if (user && [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE,
    enums.EVENT.STATUS_RESULTS.RESULTS].includes(event.get("status_results"))) {
    const voteHistoryCollection = await eventRatingService.findVoteHistory(res.locals.user.get("id"), event,
      { withRelated: ["entry.details", "entry.userRoles"] });
    const categoryTitles: string[] = event.related("details").get("category_titles");
    const divisions = Object.keys(event.get("divisions"));

    const votesPerCategory = [];
    categoryTitles.forEach((_, i) => {
      const categoryIndex = i + 1;
      const voteFilter = (division) => {
        return (vote, vote2) => {
          return vote.get("vote_" + categoryIndex) > 0 && vote.related("entry").get("division") === division;
        };
      };
      const voteSorter = (vote, vote2) => {
        return vote2.get("vote_" + categoryIndex) - vote.get("vote_" + categoryIndex);
      };

      const votesPerDivision = {};
      for (const division of divisions) {
        if (division !== enums.DIVISION.UNRANKED) {
          votesPerDivision[division] = voteHistoryCollection.filter(voteFilter(division));
          votesPerDivision[division].sort(voteSorter);
        }
      }

      votesPerCategory.push({
        title: categoryTitles[i],
        votesPerDivision,
      });
    });

    res.render("event/view-event-ratings", {
      votesPerCategory,
      ratingCount: voteHistoryCollection.length,
    });
  } else {
    res.errorPage(404);
  }
}

/**
 * Browse event results
 */
async function viewEventResults(req, res) {
  res.locals.pageTitle += " | Results";

  // Permission checks & special post case
  const statusResults = res.locals.event.get("status_results");
  if (forms.isId(statusResults)) {
    res.locals.resultsPost = await postService.findPostById(statusResults);
    res.locals.userLikes = await likeService.findUserLikeInfo([res.locals.resultsPost], res.locals.user);
  } else if (statusResults !== enums.EVENT.STATUS_RESULTS.RESULTS) {
    res.errorPage(404);
    return;
  }

  // Parse query
  let sortedBy = 1;
  let division = eventService.getDefaultDivision(res.locals.event);
  if (Object.keys(res.locals.event.get("divisions")).includes(req.query.division)) {
    division = req.query.division;
  }
  let context;
  if (division === enums.DIVISION.UNRANKED) {
    const cacheKey = "results_" + res.locals.event.get("name") + "_" + division;
    context = await cache.getOrFetch(cache.general, cacheKey, async () => {
      const findGameOptions = {
        eventId: res.locals.event.get("id"),
        divisions: [enums.DIVISION.UNRANKED],
      };
      const games = await eventService.findGames(findGameOptions);
      return {
        rankings: games.models,
        sortedBy,
        division,
      };
    });
  } else {
    if (forms.isInt(req.query.sortBy) && req.query.sortBy > 0 && req.query.sortBy <= constants.MAX_CATEGORY_COUNT) {
      sortedBy = parseInt(req.query.sortBy, 10);
    }

    // Gather entries rankings
    const cacheKey = "results_" + res.locals.event.get("name") + "_" + division + "_" + sortedBy;
    context = await cache.getOrFetch(cache.general, cacheKey, async () => {
      const rankingsCollection = await eventRatingService.findEntryRankings(res.locals.event, division, sortedBy);
      return {
        rankings: rankingsCollection.models,
        sortedBy,
        division,
      };
    });
  }

  res.render("event/view-event-results", context);
}

/**
 * View the games of a tournament
 */
async function viewEventTournamentGames(req, res) {
  res.locals.pageTitle += " | Tournament games";

  const { user, event } = res.locals;

  const statusTournament = event.get("status_tournament");
  if ([enums.EVENT.STATUS_TOURNAMENT.DISABLED, enums.EVENT.STATUS_TOURNAMENT.OFF].includes(statusTournament)) {
    res.errorPage(404);
    return;
  }

  const cacheKey = "event-" + event.get("name") + "-tournament-games";
  const context = await cache.getOrFetch(cache.general, cacheKey, async () => {
    const tournamentEntries = await eventTournamentService.findTournamentEntries(event, { withDetails: true });
    const entries = tournamentEntries.map((tEntry) => tEntry.related("entry"));
    const highScoresMap = await highScoreService.findHighScoresMap(entries);
    return {
      entries,
      highScoresMap,
    };
  }, 10 /* 10 seconds */);

  context.userScoresMap = user ? await highScoreService.findUserScoresMapByEntry(user.get("id"), context.entries) : {};
  context.tournamentScore = user ? await eventTournamentService.findOrCreateTournamentScore(
    event.get("id"), user.get("id")) : null;
  context.activeEntries = (await highScoreService.findRecentlyActiveEntries({
      eventId: event.get("id"),
      limit: 10
    })).models;

  res.render("event/view-event-tourn-games", context);
}

/**
 * Submit a game to a tournament
 */
async function submitTournamentGame(req, res) {
  // TODO
  res.redirect("./tournament-games");
}

/**
 * View the leaderboard of a tournament
 */
async function viewEventTournamentLeaderboard(req, res) {
  res.locals.pageTitle += " | Leaderboard";

  const { event } = res.locals;

  const statusTournament = event.get("status_tournament");
  if (![enums.EVENT.STATUS_TOURNAMENT.PLAYING, enums.EVENT.STATUS_TOURNAMENT.CLOSED,
    enums.EVENT.STATUS_TOURNAMENT.RESULTS].includes(statusTournament)) {
    res.errorPage(404);
    return;
  }

  const tEntries = await eventTournamentService.findTournamentEntries(event);

  res.render("event/view-event-tourn-leaderboard", {
    tournamentScores: (await eventTournamentService.findTournamentScores(event)).models,
    entries: tEntries.map((tEntry) => tEntry.related("entry")),
  });
}

async function pickEventTemplate(req, res) {
  if (!securityService.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  res.render("event/pick-event-template", {
    eventTemplates: (await eventService.findEventTemplates()).models,
  });
}

/**
 * Edit or create an event
 */
async function editEvent(req, res) {
  if (!securityService.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  let errorMessage = res.locals.errorMessage;
  let infoMessage = "";
  let redirected = false;
  let event = res.locals.event;

  if (req.body && req.body.name && req.body.title) {
    const creation = !event;

    // TODO Fields should not be reset if validation fails
    if (!forms.isSlug(req.body.name)) {
      errorMessage = "Name is not a valid slug";
    } else if (req.body.name.indexOf("-") === -1) {
      errorMessage = "Name must contain at least one hyphen (-)";
    } else if (req.body["event-preset-id"] && !forms.isInt(req.body["event-preset-id"])) {
      errorMessage = "Invalid event preset ID";
    } else if (!forms.isIn(req.body.status, enums.EVENT.STATUS)) {
      errorMessage = "Invalid status";
    } else if (!forms.isIn(req.body["status-rules"], enums.EVENT.STATUS_RULES) &&
        !forms.isId(req.body["status-rules"])) {
      errorMessage = "Invalid welcome/rules post status";
    } else if (!forms.isIn(req.body["status-theme"], enums.EVENT.STATUS_THEME) &&
        !forms.isId(req.body["status-theme"])) {
      errorMessage = "Invalid theme status";
    } else if (!forms.isIn(req.body["status-entry"], enums.EVENT.STATUS_ENTRY)) {
      errorMessage = "Invalid entry status";
    } else if (!forms.isIn(req.body["status-results"], enums.EVENT.STATUS_RESULTS) &&
        !forms.isId(req.body["status-results"])) {
      errorMessage = "Invalid results status";
    } else if (!forms.isIn(req.body["status-tournament"], enums.EVENT.STATUS_TOURNAMENT)) {
      errorMessage = "Invalid tournament status";
    } else if (event) {
      const matchingEventsCollection = await eventService.findEvents({ name: req.body.name });
      for (const matchingEvent of matchingEventsCollection.models) {
        if (event.id !== matchingEvent.id) {
          errorMessage = "Another event with the same exists";
        }
      }
    }
    if (!errorMessage) {
      try {
        req.body.divisions = JSON.parse(req.body.divisions || "{}");
      } catch (e) {
        errorMessage = "Invalid divisions JSON";
      }
    }
    if (!errorMessage) {
      try {
        req.body["category-titles"] = JSON.parse(req.body["category-titles"] || "[]");
        if (req.body["category-titles"].length > constants.MAX_CATEGORY_COUNT) {
          errorMessage = "Events cannot have more than " + constants.MAX_CATEGORY_COUNT + " rating categories";
        }
      } catch (e) {
        errorMessage = "Invalid rating category JSON";
      }
    }
    if (!errorMessage) {
      try {
        req.body.links = JSON.parse(req.body.links || "[]");
      } catch (e) {
        errorMessage = "Invalid links JSON";
      }
    }
    if (!errorMessage && (req.files.logo || req.body["logo-delete"])) {
      const file = req.files.logo ? req.files.logo[0] : null;
      const result = await fileStorage.savePictureToModel(event, "logo", file,
        req.body["logo-delete"], `/events/${event.get("name")}/logo`, { maxDiagonal: 1000 });
      if (result.error) {
        errorMessage = result.error;
      }
    }

    if (!errorMessage) {
      if (creation) {
        event = eventService.createEvent();
      }

      const previousName = event.get("name");
      event.set({
        title: forms.sanitizeString(req.body.title),
        name: req.body.name,
        display_dates: forms.sanitizeString(req.body["display-dates"]),
        display_theme: forms.sanitizeString(req.body["display-theme"]),
        started_at: forms.parseDateTime(req.body["started-at"]),
        divisions: req.body.divisions,
        event_preset_id: req.body["event-preset-id"] || null,
        status: req.body.status,
        status_rules: req.body["status-rules"],
        status_theme: req.body["status-theme"],
        status_entry: req.body["status-entry"],
        status_results: req.body["status-results"],
        status_tournament: req.body["status-tournament"],
        countdown_config: {
          message: forms.sanitizeString(req.body["countdown-message"]),
          link: forms.sanitizeString(req.body["countdown-link"]),
          date: forms.parseDateTime(req.body["countdown-date"]),
          phrase: forms.sanitizeString(req.body["countdown-phrase"]),
          enabled: req.body["countdown-enabled"] === "on",
        },
      });

      // Triggers
      if (event.hasChanged("status_theme") && event.get("status_theme") === enums.EVENT.STATUS_THEME.SHORTLIST) {
        await eventThemeService.computeShortlist(event);
        infoMessage = "Theme shortlist computed.";
      }
      if (event.hasChanged("status_results")) {
        if (event.get("status_results") === enums.EVENT.STATUS_RESULTS.RESULTS) {
          await eventRatingService.computeRankings(event);
          infoMessage = "Event results computed.";
        } else if (event.previous("status_results") === enums.EVENT.STATUS_RESULTS.RESULTS) {
          await eventRatingService.clearRankings(event);
          infoMessage = "Event results cleared.";
        }
      }
      if (event.hasChanged("status_tournament")
          && event.previous("status_tournament") === enums.EVENT.STATUS_TOURNAMENT.OFF) {
        // Pre-fill leaderboard with people who were already in the high scores
        eventTournamentService.recalculateAllTournamentScores(highScoreService, event);
      }

      // Caches clearing
      cache.general.del("active-tournament-event");
      const nameChanged = event.hasChanged("name");
      event = await event.save();
      cache.eventsById.del(event.get("id"));
      cache.eventsByName.del(event.get("name"));
      if (nameChanged && previousName) {
        await eventService.refreshEventReferences(event);
        cache.eventsByName.del(previousName);
      }

      // Event details update
      const eventDetails = event.related("details");
      eventDetails.set({
        links: req.body.links,
        category_titles: req.body["category-titles"],
      });
      if (req.files.banner || req.body["banner-delete"]) {
        const file = req.files.banner ? req.files.banner[0] : null;
        const result = await fileStorage.savePictureToModel(eventDetails, "banner", file,
          req.body["banner-delete"], `/events/${event.get("name")}/banner`, { maxDiagonal: 3000 });
        if (result.error) {
          errorMessage = result.error;
        }
      }
      await eventDetails.save();

      if (creation) {
        res.redirect(templating.buildUrl(event, "event", "edit"));
        redirected = true;
      }
    }
  }

  if (!redirected) {
    // Initialize event (optionally from template)
    if (!event) {
      let eventTemplate = null;
      if (forms.isId(req.query["event-template-id"])) {
        eventTemplate = await eventService.findEventTemplateById(parseInt(req.query["event-template-id"], 10));
      }
      event = eventService.createEvent(eventTemplate);
    }

    // Render
    res.render("event/edit-event", {
      event,
      eventPresetsData: (await eventService.findEventPresets()).toJSON(),
      infoMessage,
      errorMessage,
    });
  }
}

/**
 * Manage the event's submitted themes
 */
async function editEventThemes(req, res) {
  res.locals.pageTitle += " | Themes";

  if (!securityService.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  // Init context
  const event = res.locals.event;
  const shortlistCollection = await eventThemeService.findShortlist(event);
  const context: any = {
    eliminationMinNotes: await settingService.findNumber(
      constants.SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, 5),
    eliminationThreshold: await settingService.findNumber(
      constants.SETTING_EVENT_THEME_ELIMINATION_THRESHOLD, 0.58),
    shortlist: shortlistCollection.models,
    eliminatedShortlistThemes: eventThemeService.computeEliminatedShortlistThemes(event),
  };

  if (req.method === "POST") {
    if (forms.isId(req.body.id)) {
      // Save theme title
      const theme = await eventThemeService.findThemeById(req.body.id);
      if (theme) {
        theme.set("title", forms.sanitizeString(req.body.title));
        await theme.save();
      }
    } else if (req.body.elimination) {
      // Save shortlist elimination settings
      const eventDetails = event.related("details");
      const sanitizedDelay = forms.isInt(req.body["elimination-delay"])
        ? parseInt(req.body["elimination-delay"], 10) : 8;
      eventDetails.set("shortlist_elimination", {
        start: forms.parseDateTime(req.body["elimination-start-date"]),
        delay: sanitizedDelay,
        body: forms.sanitizeMarkdown(req.body["elimination-body"]),
        stream: forms.sanitizeString(req.body.stream),
      });
      await eventDetails.save();
      cache.eventsById.del(event.get("id"));
      cache.eventsByName.del(event.get("name"));
    }
  }

  if (forms.isId(req.query.edit)) {
    // Edit theme title
    context.editTheme = await eventThemeService.findThemeById(req.query.edit);
  } else if (forms.isId(req.query.ban)) {
    // Ban theme
    const theme = await eventThemeService.findThemeById(req.query.ban);
    if (theme) {
      theme.set("status", enums.THEME.STATUS.BANNED);
      await theme.save();
    }
  } else if (forms.isId(req.query.unban)) {
    // Unban theme
    const theme = await eventThemeService.findThemeById(req.query.unban);
    if (theme) {
      theme.set("status", (event.get("status_theme") === enums.EVENT.STATUS_THEME.VOTING)
        ? enums.THEME.STATUS.ACTIVE : enums.THEME.STATUS.OUT);
      await theme.save();
    }
  }

  // Fetch themes list at the end to make sure all changes are visible
  const themesCollection = await eventThemeService.findAllThemes(event);
  context.themes = themesCollection.models;

  res.render("event/edit-event-themes", context);
}

/**
 * Browse event entries
 */
async function editEventEntries(req, res) {
  res.locals.pageTitle += " | Entries";

  if (!securityService.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  const event = res.locals.event;

  // Find all entries
  const findGameOptions: any = {
    eventId: event.get("id"),
    pageSize: null,
    withRelated: ["userRoles", "details"],
  };
  if (req.query.orderBy === "ratingCount") {
    findGameOptions.sortByRatingCount = true;
  }
  const entriesCollection = await eventService.findGames(findGameOptions);

  // Gather info for karma details
  const entriesById = {};
  entriesCollection.each((entry) => {
    entriesById[entry.get("id")] = entry;
  });
  const detailedEntryInfo: any = {};
  const usersById = {};
  if (forms.isId(req.query.entryDetails) && entriesById[req.query.entryDetails]) {
    const eventUsersCollection = await userService.findUsers({ eventId: event.get("id") });
    eventUsersCollection.each((user) => {
      usersById[user.get("id")] = user;
    });

    const entry = entriesById[req.query.entryDetails];
    await entry.load(["comments", "votes"]);
    detailedEntryInfo.id = req.query.entryDetails;
    detailedEntryInfo.given = await eventRatingService.computeKarmaGivenByUserAndEntry(entry, event);
    detailedEntryInfo.received = await eventRatingService.computeKarmaReceivedByUser(entry);
    detailedEntryInfo.total = eventRatingService.computeKarma(detailedEntryInfo.received.total,
      detailedEntryInfo.given.total);
  }

  res.render("event/edit-event-entries", {
    entries: entriesCollection.models,
    entriesById,
    usersById,
    detailedEntryInfo,
  });
}

/**
 * Manage tournament games
 */
async function editEventTournamentGames(req, res) {
  res.locals.pageTitle += " | Tournament games";

  const { user, event } = res.locals;

  if (!securityService.isMod(user)) {
    res.errorPage(403);
    return;
  }

  let errorMessage;
  if (req.method === "POST") {
    // Add to tournament
    if (req.body.add !== undefined) {
      if (forms.isId(req.body.add)) {
        const entry = await eventService.findEntryById(req.body.add);
        if (entry) {
          await eventTournamentService.addTournamentEntry(event.get("id"), entry.get("id"));
          eventTournamentService.recalculateAllTournamentScores(highScoreService, event, [entry]);
        } else {
          errorMessage = "Entry not found with ID " + req.body.add;
        }
      } else {
        errorMessage = "Invalid entry ID";
      }
    }

    // Update order
    if (req.body.update !== undefined && forms.isId(req.body.id)) {
      if (forms.isInt(req.body.ordering)) {
        const entry = await eventService.findEntryById(req.body.id);
        if (entry) {
          await eventTournamentService.saveTournamentEntryOrdering(event.get("id"), entry.get("id"), req.body.ordering);
        }
      } else {
        errorMessage = "Invalid order";
      }
    }

    // Remove from tournament
    if (req.body.remove !== undefined && forms.isId(req.body.id)) {
      const entry = await eventService.findEntryById(req.body.id);
      if (entry) {
        await eventTournamentService.removeTournamentEntry(event.get("id"), entry.get("id"));
        eventTournamentService.recalculateAllTournamentScores(highScoreService, event, [entry]);
      }
    }

    // Refresh scores
    if (req.body.refresh || req.body["refresh-all"]) {
      const onlyRefreshEntries = (!req.body["refresh-all"] && forms.isId(req.body.refresh))
        ? [await eventService.findEntryById(req.body.id)] : null;
      await eventTournamentService.recalculateAllTournamentScores(highScoreService, event, onlyRefreshEntries);
    }
  }

  // Load tournament entries
  res.render("event/edit-event-tourn-games", {
    tournamentEntries: await eventTournamentService.findTournamentEntries(event),
    errorMessage,
  });
}

/**
 * Delete an event
 */
async function deleteEvent(req, res) {
  if (!securityService.isAdmin(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  if (res.locals.event.get("status") === enums.EVENT.STATUS.PENDING) {
    await res.locals.event.destroy();
    res.redirect("/events");
  } else {
    res.errorPage(403, "Only pending events can be deleted");
  }
}

/**
 * AJAX API: Find themes to vote on
 */
async function ajaxFindThemes(req, res) {
  const themesCollection = await eventThemeService.findThemesToVoteOn(res.locals.user, res.locals.event);
  const json = [];
  for (const theme of themesCollection.models) {
    json.push({
      id: theme.get("id"),
      title: theme.get("title"),
    });
  }
  res.json(json);
}

/**
 * AJAX API: Save a vote
 */
async function ajaxSaveVote(req, res) {
  if (forms.isId(req.body.id) && (req.body.upvote !== undefined || req.body.downvote !== undefined)) {
    const score = (req.body.upvote !== undefined) ? 1 : -1;
    await eventThemeService.saveVote(res.locals.user, res.locals.event, parseInt(req.body.id, 10), score);
  }
  res.type("text/plain"); // Keeps Firefox from parsing the empty response as XML and logging an error.
  res.end("");
}
