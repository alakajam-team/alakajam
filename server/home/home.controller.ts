
import { BookshelfCollectionOf, BookshelfModel, EntryBookshelfModel, PostBookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import cache from "server/core/cache";
import enums from "server/core/enums";
import log from "server/core/log";
import { logErrorAndReturn } from "server/core/middleware";
import settings from "server/core/settings";
import { SETTING_FEATURED_POST_ID, SETTING_HOME_TIMELINE_SIZE } from "server/core/settings-keys";
import { loadUserShortcutsContext } from "server/event/event.middleware";
import eventService from "server/event/event.service";
import tournamentService from "server/event/tournament/tournament.service";
import commentService from "server/post/comment/comment.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import eventParticipationService from "server/event/dashboard/event-participation.service";
import twitchService from "server/event/twitch.service";
import { shuffle } from "lodash";

interface HomeContext {
  featuredPost?: PostBookshelfModel;
  featuredEventAnnouncement?: BookshelfModel;
  eventsTimeline: BookshelfModel[];
  suggestedEntries: BookshelfModel[];
  posts: PostBookshelfModel[];
  comments: BookshelfModel[];
  pageCount: number;
  tournamentScore?: BookshelfModel;
}

/**
 * Home page
 */
export async function home(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  const { user, featuredEvent } = res.locals;

  let context = cache.general.get<HomeContext>("home_page");
  if (!context) {
    context = await loadHomeContext(res);
    cache.general.set("home_page", context, 10 /* 10 seconds */);
  }

  await loadUserShortcutsContext(res, featuredEvent, { postFromAnyEvent: true });

  const joinEnabled = featuredEvent.get("status_entry") !== enums.EVENT.STATUS_ENTRY.CLOSED;
  if (user) {
    const allPostsInPage = [context.featuredEventAnnouncement, context.featuredPost].concat(context.posts);

    await Promise.all([
      likeService.findUserLikeInfo(allPostsInPage as PostBookshelfModel[], user),
      featuredEvent ? eventService.findUserEntryForEvent(user, featuredEvent.get("id")) : undefined,
      tournamentService.findOrCreateTournamentScore(featuredEvent.get("id"), user.get("id")),
      eventParticipationService.getEventParticipation(featuredEvent.get("id"), user.get("id")),
      twitchService.listCurrentLiveUsers(featuredEvent)
    ]).then(([userLikes, entry, tournamentScore, eventParticipation, liveUsers]) => {
      res.locals.userLikes = userLikes;
      res.locals.entry = entry;
      res.locals.tournamentScore = tournamentScore;
      res.locals.eventParticipation = eventParticipation;
      res.locals.inviteToJoin = joinEnabled && eventParticipation;
      res.locals.featuredStreamer = liveUsers.length > 0 ? shuffle(liveUsers)[0] : undefined;
    });
  } else {
    res.locals.inviteToJoin = joinEnabled;
  }

  res.render<CommonLocals>("home/home", {
    ...res.locals,
    ...context
  });
}

async function loadHomeContext(res: CustomResponse<CommonLocals>): Promise<HomeContext> {
  const { featuredEvent, user } = res.locals;

  const context: Partial<HomeContext> = {};
  const contextTasks: Array<Promise<any>> = [];

  // Find latest announcement for featured event
  if (featuredEvent) {
    contextTasks.push(
      postService.findLatestAnnouncement({ eventId: featuredEvent.get("id") })
        .then((announcement) => context.featuredEventAnnouncement = announcement)
        .catch(log.error));
  }

  // Fetch event schedule (preferably without displaying too many events after the featured one)
  contextTasks.push(
    loadEventsTimeline(featuredEvent)
      .then((eventsTimeline) => context.eventsTimeline = eventsTimeline)
      .catch(logErrorAndReturn([])));

  // Gather featured entries during the voting phase
  if (featuredEvent && [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE]
    .includes(featuredEvent.get("status_results"))) {
    contextTasks.push(
      eventService.findGames({
        eventId: featuredEvent.get("id"),
        pageSize: 3,
        notReviewedById: user ? user.get("id") : undefined,
      })
        .then((suggestedEntriesCollection: BookshelfCollectionOf<EntryBookshelfModel>) => {
          context.suggestedEntries = suggestedEntriesCollection.models;
        })
        .catch(logErrorAndReturn([])));
  }

  // Gather posts and comments
  contextTasks.push(
    postService.findPosts({ specialPostType: null })
      .then(async (postsCollection) => {
        await postsCollection.load(["entry", "event", "entry.userRoles"]);
        context.posts = postsCollection.models;
        context.pageCount = postsCollection.pagination.pageCount;
      })
      .catch(logErrorAndReturn([])));
  contextTasks.push(
    commentService.findLatestComments({ limit: 10 })
      .then(async (commentsCollection) => {
        context.comments = commentsCollection.models;
      })
      .catch(logErrorAndReturn([])));

  // Find featured post
  contextTasks.push(
    settings.findNumber(SETTING_FEATURED_POST_ID, 0)
      .then(async (featuredPostId) => {
        if (featuredPostId) {
          context.featuredPost = await postService.findPostById(featuredPostId);
        }
      })
      .catch(log.error));

  // Fetch all the things at once!
  await Promise.all(contextTasks);

  return context as HomeContext;
}

async function loadEventsTimeline(featuredEvent?: BookshelfModel): Promise<BookshelfModel[]> {
  if (featuredEvent) {
    let featuredEventIndex;
    let fetchedEventsCollection;
    let eventsTimeline = [];
    let page = 1;
    do {
      fetchedEventsCollection = await eventService.findEvents({ pageSize: 10, page: page++ });
      eventsTimeline = eventsTimeline.concat(fetchedEventsCollection.models);
      featuredEventIndex = eventsTimeline.findIndex((event) => event.get("id") === featuredEvent.get("id"));
      // Make sure we have the featured event + at least one past event (or we have run out of events)
    } while ((featuredEventIndex === -1 || featuredEventIndex >= eventsTimeline.length - 1)
      && fetchedEventsCollection.length > 0);

    // Grab one past event, fill the list up to SETTING_HOME_TIMELINE_SIZE events total, display in chronological order
    const eventCount = await settings.findNumber(SETTING_HOME_TIMELINE_SIZE, 5);
    const startIndex = Math.max(0, featuredEventIndex - 2);
    return eventsTimeline.slice(startIndex, startIndex + eventCount).reverse();
  } else {
    const fetchedEventsCollection = await eventService.findEvents({ pageSize: 5 });
    return fetchedEventsCollection.models;
  }
}
