import constants from "server/core/constants";
import forms from "server/core/forms";
import security from "server/core/security";
import settings from "server/core/settings";
import templating from "server/core/templating-functions";
import highscoreService from "server/entry/highscore/entry-highscore.service";
import tagService from "server/entry/tag/tag.service";
import eventService from "server/event/event.service";
import eventRatingService from "server/event/rating/event-rating.service";
import eventTournamentService from "server/event/tournament/tournament.service";
import { handleSaveComment } from "server/post/comment/comment.controller";
import commentService from "server/post/comment/comment.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";

/**
 * Browse entry
 */
export async function entryView(req, res) {
  const { user, entry } = res.locals;

  // Let the template display user thumbs
  await entry.load(["invites.invited", "userRoles.user"]);

  // Check voting phase
  const eventVote = eventRatingService.areVotesAllowed(res.locals.event);

  // Fetch vote on someone else's entry
  let vote;
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
    minEntryVotes = await settings.findNumber(constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, 10);
  }

  let editableAnonComments = null;
  if (res.locals.user && entry.get("allow_anonymous")) {
    editableAnonComments = await commentService.findOwnAnonymousCommentIds(res.locals.user, entry.get("id"), "entry");
  }

  const posts = await postService.findPosts({
    entryId: entry.get("id"),
  });

  let userScore = null;
  let userLikes = null;
  if (user) {
    userScore = await highscoreService.findEntryScore(user.get("id"), entry.get("id"));
    userLikes = await likeService.findUserLikeInfo(posts, user);
  }

  res.render("entry/entry-view", {
    sortedComments: await commentService.findCommentsSortedForDisplay(entry),
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
    tournamentEvent: await eventTournamentService.findActiveTournamentPlaying(entry.get("id")),
  });
}

/**
 * Saves a comment or vote made to an entry
 */
export async function entrySaveCommentOrVote(req, res) {
  const { entry, event, user } = res.locals;

  // Security checks
  if (!user) {
    res.errorPage(403);
    return;
  }

  if (req.body.action === "comment") {
    // Save comment
    const redirectUrl = await handleSaveComment(
      req.body, user, entry, templating.buildUrl(entry, "entry"), event);
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
export async function apiSearchForTeammate(req, res) {
  let errorMessage;
  if (!req.query || !req.query.name) {
    errorMessage = "No search parameter";
  }
  const nameFragment = forms.sanitizeString(req.query.name);
  if (!nameFragment || nameFragment.length < 3) {
    errorMessage = `Invalid name fragment: '${req.query.name}'`;
  } else if (req.query.entryId && !forms.isId(req.query.entryId)) {
    errorMessage = "Invalid entry ID";
  }

  if (!errorMessage) {
    let entry = null;
    if (req.query.entryId) {
      entry = await eventService.findEntryById(req.query.entryId);
    }

    const matches = await eventService.searchForTeamMembers(nameFragment,
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
export async function apiSearchForExternalEvents(req, res) {
  let errorMessage;

  if (!req.query || !req.query.name) {
    errorMessage = "No search parameter";
  }
  const nameFragment = forms.sanitizeString(req.query.name);
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
export async function apiSearchForTags(req, res) {
  let errorMessage;

  if (!req.query || !req.query.name) {
    errorMessage = "No search parameter";
  }
  const nameFragment = forms.sanitizeString(req.query.name);
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
