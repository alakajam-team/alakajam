import { BookshelfCollection, BookshelfModel } from "bookshelf";
import forms from "server/core/forms";
import links from "server/core/links";
import security from "server/core/security";
import settings from "server/core/settings";
import { SETTING_EVENT_REQUIRED_ENTRY_VOTES } from "server/core/settings-keys";
import entryTeamService from "server/entry/entry-team.service";
import highscoreService from "server/entry/highscore/entry-highscore.service";
import tagService from "server/entry/tag/tag.service";
import eventService from "server/event/event.service";
import eventRatingService from "server/event/rating/event-rating.service";
import tournamentService from "server/event/tournament/tournament.service";
import { handleSaveComment } from "server/post/comment/comment.controller";
import commentService from "server/post/comment/comment.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EntryLocals } from "./entry.middleware";

/**
 * Browse entry
 */
export async function entryView(req: CustomRequest, res: CustomResponse<EntryLocals>) {
  const { user, entry } = res.locals;

  // Let the template display user thumbs
  await entry.load(["invites.invited", "userRoles.user"]);

  // Check voting phase
  const eventVote = eventRatingService.areVotesAllowed(res.locals.event);

  // Fetch vote on someone else's entry
  let vote: BookshelfModel;
  let canVote = false;
  if (res.locals.user && eventVote &&
      !security.canUserWrite(res.locals.user, entry)) {
    canVote = await eventRatingService.canVoteOnEntry(res.locals.user, entry);
    if (canVote) {
      vote = await eventRatingService.findEntryVote(res.locals.user, entry);
    }
  }

  // Count votes
  const entryVotes = await eventRatingService.countEntryVotes(entry);
  let minEntryVotes = null;
  if (res.locals.user && security.canUserWrite(res.locals.user, entry)) {
    minEntryVotes = await settings.findNumber(SETTING_EVENT_REQUIRED_ENTRY_VOTES, 10);
  }

  let editableAnonComments = null;
  if (res.locals.user && entry.get("allow_anonymous")) {
    editableAnonComments = await commentService.findOwnAnonymousCommentIds(res.locals.user, entry.get("id"), "entry");
  }

  const posts = await postService.findPosts({
    entryId: entry.get("id"),
  });

  let userScore: BookshelfModel = null;
  let userLikes: Record<number, string> = null;
  if (user) {
    userScore = await highscoreService.findEntryScore(user.get("id"), entry.get("id"));
    userLikes = await likeService.findUserLikeInfo(posts.models, user);
  }

  res.renderJSX<EntryLocals>("entry/entry-view", {
    ...res.locals,
    sortedComments: await commentService.findCommentsOnNodeForDisplay(entry),
    editableAnonComments,
    posts,
    entryVotes,
    minEntryVotes,
    vote,
    canVote,
    eventVote,
    external: !res.locals.event,
    highScoresCollection: await highscoreService.findHighScores(entry),
    userScore,
    userLikes,
    tournamentEvent: await tournamentService.findActiveTournamentPlaying(entry.get("id")),
    nodeAuthorIds: entry.related<BookshelfCollection>("userRoles").map(userRole => userRole.get("user_id"))
  });
}

/**
 * Saves a comment or vote made to an entry
 */
export async function entrySaveCommentOrVote(req: CustomRequest, res: CustomResponse<EntryLocals>) {
  const { entry, event, user } = res.locals;

  // Security checks
  if (!user) {
    res.errorPage(403);
    return;
  }

  if (req.body.action === "comment") {
    // Save comment
    const redirectUrl = await handleSaveComment(
      req.body, user, entry, links.routeUrl(entry, "entry"), event);
    res.redirect(redirectUrl);
  } else if (req.body.action === "vote") {
    // Save vote
    let i = 1;
    const votes = [];
    while (req.body["vote-" + i] !== undefined) {
      votes.push(req.body["vote-" + i]);
      i++;
    }
    if (await eventRatingService.canVoteOnEntry(res.locals.user, res.locals.entry)) {
      await eventRatingService.saveEntryVote(res.locals.user, res.locals.entry, res.locals.event, votes);
    }
    entryView(req, res);
  }
}

/**
 * Search for team mates with usernames matching a string
 * @param {string} req.query.name a string to search user names with.
 */
export async function apiSearchForTeammate(req: CustomRequest, res: CustomResponse<EntryLocals>) {
  let errorMessage: string;
  if (!req.query || !req.query.name) {
    errorMessage = "No search parameter";
  }
  const nameFragment = forms.sanitizeString(req.query.name?.toString());
  if (!nameFragment || nameFragment.length < 3) {
    errorMessage = `Invalid name fragment: '${req.query.name}'`;
  } else if (req.query.entryId && !forms.isId(req.query.entryId)) {
    errorMessage = "Invalid entry ID";
  }

  if (!errorMessage) {
    let entry = null;
    if (forms.isId(req.query.entryId)) {
      entry = await eventService.findEntryById(forms.parseInt(req.query.entryId));
    }

    const matches = await entryTeamService.searchForTeamMembers(nameFragment,
      res.locals.event ? res.locals.event.id : null, entry);

    const entryId = entry ? entry.get("id") : -1;
    const getStatus = (match) => {
      switch (match.node_id) {
      case null: return "available";
      case entryId: return "member";
      default: return "unavailable";
      }
    };

    const responseData = {
      matches: matches.map((match) => ({
        id: match.id,
        text: match.title,
        avatar: match.avatar,
        status: getStatus(match),
      })),
    };
    res.json(responseData);
  } else {
    res.status(400).json({ error: errorMessage });
  }
}

/**
 * AJAX endpoint : Finds external event names
 */
export async function apiSearchForExternalEvents(req: CustomRequest, res: CustomResponse<EntryLocals>) {
  let errorMessage: string;

  if (!req.query || !req.query.name) {
    errorMessage = "No search parameter";
  }
  const nameFragment = forms.sanitizeString(req.query.name?.toString());
  if (!nameFragment || nameFragment.length < 3) {
    errorMessage = `Invalid name fragment: '${req.query.name}'`;
  }

  if (!errorMessage) {
    const results = await eventService.searchForExternalEvents(nameFragment);
    res.json(results);
  } else {
    res.status(400).json({ error: errorMessage });
  }
}

/**
 * AJAX endpoint : Finds tags
 */
export async function apiSearchForTags(req: CustomRequest, res: CustomResponse<EntryLocals>) {
  let errorMessage: string;

  if (!req.query || !req.query.name) {
    errorMessage = "No search parameter";
  }
  const nameFragment = forms.sanitizeString(req.query.name?.toString());
  if (!nameFragment || nameFragment.length < 3) {
    errorMessage = `Invalid name fragment: '${req.query.name}'`;
  }

  if (!errorMessage) {
    const matches = await tagService.searchTags(nameFragment);

    const responseData = {
      matches: matches.map((match) => ({
        id: match.id,
        value: match.value,
      })),
    };
    res.json(responseData);
  } else {
    res.status(400).json({ error: errorMessage });
  }
}
