import { BookshelfCollection, BookshelfModel } from "bookshelf";
import * as lodash from "lodash";
import enums from "server/core/enums";
import forms from "server/core/forms";
import settings from "server/core/settings";
import {
  SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES,
  SETTING_EVENT_THEME_IDEAS_REQUIRED,

  SETTING_EVENT_THEME_SHORTLIST_SIZE, SETTING_EVENT_THEME_SUGGESTIONS
} from "server/core/settings-keys";
import { ThemeShortlistEliminationState } from "server/entity/event-details.entity";
import { User } from "server/entity/user.entity";
import themeService from "server/event/theme/theme.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "../event.middleware";
import themeShortlistService from "./theme-shortlist.service";
import themeVotingService from "./theme-voting.service";

/**
 * Submit themes to an event, view and vote on other themes
 */
export async function eventThemes(req: CustomRequest, res: CustomResponse<EventLocals>) {
  res.locals.pageTitle += " | Themes";

  const event = res.locals.event;

  const statusThemes = event.get("status_theme");
  if ([enums.EVENT.STATUS_THEME.DISABLED, enums.EVENT.STATUS_THEME.OFF].includes(statusThemes)) {
    res.errorPage(404);
  } else {
    let context: any = {
      maxThemeSuggestions: await settings.findNumber(
        SETTING_EVENT_THEME_SUGGESTIONS, 3),
      eliminationMinNotes: await settings.findNumber(
        SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, 5),
      infoMessage: null,
      defaultShortlistSize: await settings.findNumber(
        SETTING_EVENT_THEME_SHORTLIST_SIZE, 10)
    };

    if (forms.isId(statusThemes)) {
      context.themesPost = await postService.findPostById(statusThemes);
      context.userLikes = await likeService.findUserLikeInfo([context.themesPost], res.locals.user);
    } else {
      if (req.method === "POST" && res.locals.user) {
        if (req.body.action === "ideas") {
          // Gather ideas data
          const ideas: Array<{id?: string; title: string}> = [];
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
          await themeService.saveThemeSubmissions(res.locals.user, event, ideas);
        } else if (req.body.action === "vote") {
          if (forms.isId(req.body["theme-id"]) && (req.body.upvote !== undefined || req.body.downvote !== undefined)) {
            const score = (req.body.upvote !== undefined) ? 1 : -1;
            await themeVotingService.saveVote(res.locals.user, event, forms.parseInt(req.body["theme-id"]), score);
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
            await themeShortlistService.saveShortlistVotes(res.locals.user, event, ids);
            context.infoMessage = "Ranking changes saved.";
          }
        }
      }

      // Gather info for display
      const statusTheme = event.get("status_theme");

      if (res.locals.user) {
        // Logged users
        const userThemesCollection = await themeService.findThemesByUser(res.locals.user, event);
        context.userThemes = userThemesCollection.models;

        context.voteCount = await themeVotingService.findThemeVotesHistory(
          res.locals.user, event, { count: true });

        if (statusTheme === enums.EVENT.STATUS_THEME.VOTING) {
          if (await themeVotingService.isThemeVotingAllowed(event)) {
            const votesHistoryCollection = await themeVotingService.findThemeVotesHistory(
              res.locals.user, event) as BookshelfCollection;
            context.votesHistory = votesHistoryCollection.models;
            context.votingAllowed = true;
          } else {
            context.ideasRequired = await settings.find(SETTING_EVENT_THEME_IDEAS_REQUIRED, "10");
            context.votingAllowed = false;
          }
        } else if ([enums.EVENT.STATUS_THEME.SHORTLIST, enums.EVENT.STATUS_THEME.CLOSED].includes(statusTheme)) {
          context = Object.assign(context, await _generateShortlistInfo(event, res.locals.user));
          await themeShortlistService.updateShortlistAutoElimination(event);
        }
      } else {
        // Anonymous users
        if (event.get("status_theme") === enums.EVENT.STATUS_THEME.VOTING) {
          if (await themeVotingService.isThemeVotingAllowed(event)) {
            const sampleThemesCollection = await themeVotingService.findThemesToVoteOn(null, event);
            context.sampleThemes = sampleThemesCollection.models;
            context.votingAllowed = true;
          } else {
            context.ideasRequired = await settings.findNumber(SETTING_EVENT_THEME_IDEAS_REQUIRED, 10);
            context.votingAllowed = false;
          }
        } else if ([enums.EVENT.STATUS_THEME.SHORTLIST, enums.EVENT.STATUS_THEME.CLOSED].includes(statusTheme)) {
          context = Object.assign(context, await _generateShortlistInfo(event));
        }
      }

      // State-specific data
      if ([enums.EVENT.STATUS_THEME.SHORTLIST, enums.EVENT.STATUS_THEME.CLOSED,
        enums.EVENT.STATUS_THEME.RESULTS].includes(statusTheme)) {
        context.shortlistVotes = await themeShortlistService.countShortlistVotes(event);
      }
      if (statusTheme === enums.EVENT.STATUS_THEME.RESULTS) {
        const shortlistCollection = await themeShortlistService.findShortlist(event);
        context.shortlist = shortlistCollection.sortBy((theme) => -theme.get("score"));

        if (res.locals.user) {
          const shortlistVotesCollection = await themeShortlistService.findThemeShortlistVotes(event, { user: res.locals.user });
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

    res.render<EventLocals>("event/theme/event-themes", {
      ...res.locals,
      ...context
    });
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
export async function _generateShortlistInfo(event: BookshelfModel, user: User | null = null) {
  const shortlistCollection = await themeShortlistService.findShortlist(event);
  const shortlistElimination: ThemeShortlistEliminationState = event.related<BookshelfModel>("details").get("shortlist_elimination");
  const eliminatedCount = shortlistElimination.eliminatedCount || 0;

  // Split shortlist
  const info = {
    activeShortlist: shortlistCollection.filter(theme => theme.get("status") === enums.THEME.STATUS.SHORTLIST),
    eliminatedShortlist: shortlistCollection.filter(theme => theme.get("status") === enums.THEME.STATUS.SHORTLIST_OUT),
    randomizedShortlist: false,
    hasRankedShortlist: false,
    scoreByTheme: undefined
  };

  // Sort active shortlist by user score
  const shortlistVotesCollection = user ? await themeShortlistService.findThemeShortlistVotes(event, { user }) : null;
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
      shortlistCollection.slice(0, shortlistCollection.length - eliminatedCount));
    info.randomizedShortlist = true;
  }

  return info;
}

/**
 * AJAX API: Find themes to vote on
 */
export async function ajaxFindThemes(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const themesCollection = await themeVotingService.findThemesToVoteOn(res.locals.user, res.locals.event);
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
export async function ajaxSaveThemeVote(req: CustomRequest, res: CustomResponse<EventLocals>) {
  if (forms.isId(req.body.id) && (req.body.upvote !== undefined || req.body.downvote !== undefined)) {
    const score = (req.body.upvote !== undefined) ? 1 : -1;
    await themeVotingService.saveVote(res.locals.user, res.locals.event, forms.parseInt(req.body.id), score);
  }
  res.type("text/plain"); // Keeps Firefox from parsing the empty response as XML and logging an error.
  res.end("");
}
