import { BookshelfCollection } from "bookshelf";
import * as lodash from "lodash";
import constants from "server/core/constants";
import enums from "server/core/enums";
import forms from "server/core/forms";
import settings from "server/core/settings";
import eventThemeService from "server/event/theme/event-theme.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";

/**
 * Browse event theme voting
 */
export async function viewEventThemes(req, res) {
  res.locals.pageTitle += " | Themes";

  const event = res.locals.event;

  const statusThemes = event.get("status_theme");
  if ([enums.EVENT.STATUS_THEME.DISABLED, enums.EVENT.STATUS_THEME.OFF].includes(statusThemes)) {
    res.errorPage(404);
  } else {
    let context: any = {
      maxThemeSuggestions: await settings.findNumber(
        constants.SETTING_EVENT_THEME_SUGGESTIONS, 3),
      eliminationMinNotes: await settings.findNumber(
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
            const votesHistoryCollection = await eventThemeService.findThemeVotesHistory(
                res.locals.user, event) as BookshelfCollection;
            context.votesHistory = votesHistoryCollection.models;
            context.votingAllowed = true;
          } else {
            context.ideasRequired = await settings.find(constants.SETTING_EVENT_THEME_IDEAS_REQUIRED, "10");
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
            context.ideasRequired = await settings.findNumber(constants.SETTING_EVENT_THEME_IDEAS_REQUIRED, 10);
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
            shortlistVotesCollection.forEach((vote) => {
              context.userRanks[vote.get("theme_id")] = 11 - parseInt(vote.get("score"), 10);
            });
          }
        }
      }

      await event.load("details");
    }

    res.render("event/theme/event-themes", context);
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
export async function _generateShortlistInfo(event, user = null) {
  const shortlistCollection = await eventThemeService.findShortlist(event);
  const eliminatedShortlistThemes = eventThemeService.computeEliminatedShortlistThemes(event);

  // Split shortlist
  const info = {
    activeShortlist: shortlistCollection.slice(0, shortlistCollection.length - eliminatedShortlistThemes),
    eliminatedShortlist: eliminatedShortlistThemes > 0 ? shortlistCollection.slice(-eliminatedShortlistThemes) : [],
    randomizedShortlist: false,
    hasRankedShortlist: false,
    scoreByTheme: undefined
  };

  // Sort active shortlist by user score
  const shortlistVotesCollection = user ? await eventThemeService.findThemeShortlistVotes(user, event) : null;
  if (shortlistVotesCollection) {
    info.scoreByTheme = {};
    shortlistVotesCollection.forEach((vote) => {
      info.scoreByTheme[vote.get("theme_id")] = vote.get("score");
      if (vote.get("score") === 9) {
        info.hasRankedShortlist = true;
      }
    });
    info.activeShortlist.sort((t1, t2) => {
      return (info.scoreByTheme[t2.get("id")] || 0) - (info.scoreByTheme[t1.get("id")] || 0);
    });
  }

  // Shuffle active shortlist if no vote or anonymous
  if (!shortlistVotesCollection || shortlistVotesCollection.length === 0) {
    info.activeShortlist = lodash.shuffle(
      shortlistCollection.slice(0, shortlistCollection.length - eliminatedShortlistThemes));
    info.randomizedShortlist = true;
  }

  return info;
}

/**
 * AJAX API: Find themes to vote on
 */
export async function ajaxFindThemes(req, res) {
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
export async function ajaxSaveThemeVote(req, res) {
  if (forms.isId(req.body.id) && (req.body.upvote !== undefined || req.body.downvote !== undefined)) {
    const score = (req.body.upvote !== undefined) ? 1 : -1;
    await eventThemeService.saveVote(res.locals.user, res.locals.event, parseInt(req.body.id, 10), score);
  }
  res.type("text/plain"); // Keeps Firefox from parsing the empty response as XML and logging an error.
  res.end("");
}
