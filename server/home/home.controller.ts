
import { BookshelfCollectionOf, BookshelfModel, EntryBookshelfModel, PostBookshelfModel } from "bookshelf";
import { shuffle } from "lodash";
import { CommonLocals } from "server/common.middleware";
import cache from "server/core/cache";
import enums from "server/core/enums";
import log from "server/core/log";
import { logErrorAnd } from "server/core/middleware";
import settings from "server/core/settings";
import { SETTING_FEATURED_POST_ID, SETTING_FEATURED_TWITCH_CHANNEL, SETTING_HOME_TIMELINE_SIZE } from "server/core/settings-keys";
import { User } from "server/entity/user.entity";
import entryService from "server/entry/entry.service";
import eventParticipationService from "server/event/dashboard/event-participation.service";
import { loadUserShortcutsContext } from "server/event/event.middleware";
import eventService from "server/event/event.service";
import twitchService from "server/event/streamers/twitch.service";
import tournamentService from "server/event/tournament/tournament.service";
import commentService from "server/post/comment/comment.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";

export interface HomeContext extends CommonLocals {
  featuredPost?: PostBookshelfModel;
  featuredEventAnnouncement?: BookshelfModel;
  jumboStream?: string;
  embedStreamer?: User;
  eventsTimeline: BookshelfModel[];
  suggestedEntries: EntryBookshelfModel[];
  posts: PostBookshelfModel[];
  comments: BookshelfModel[];
  pageCount: number;
  tournamentScore?: BookshelfModel;
}

/**
 * Home page
 */
export async function home(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  const { user, featuredEvent } = res.locals;

  let context = cache.general.get<HomeContext>("home_page");
  if (!context) {
    context = await loadHomeContext(res);
    cache.general.set("home_page", context, 10 /* 10 seconds */);
  }

  let joinEnabled: boolean;
  if (featuredEvent) {
    await loadUserShortcutsContext(res, featuredEvent, { postFromAnyEvent: true });
    joinEnabled = featuredEvent?.get("status_entry") !== enums.EVENT.STATUS_ENTRY.CLOSED;
  } else {
    joinEnabled = false;
  }

  if (user) {
    const allPostsInPage = [context.featuredEventAnnouncement, context.featuredPost].concat(context.posts);

    await Promise.all([
      likeService.findUserLikeInfo(allPostsInPage as PostBookshelfModel[], user),
      featuredEvent ? entryService.findUserEntryForEvent(user, featuredEvent.get("id")) : undefined,
      featuredEvent ? tournamentService.findOrCreateTournamentScore(featuredEvent.get("id"), user.get("id")) : undefined,
      featuredEvent ? eventParticipationService.getEventParticipation(featuredEvent.get("id"), user.get("id")) : undefined,
      featuredEvent ? twitchService.listCurrentLiveUsers(featuredEvent, { alakajamRelatedOnly: true }) : []
    ]).then(([userLikes, entry, tournamentScore, eventParticipation, liveUsers]) => {
      res.locals.userLikes = userLikes;
      res.locals.entry = entry;
      res.locals.tournamentScore = tournamentScore;
      res.locals.eventParticipation = eventParticipation;
      res.locals.inviteToJoin = Boolean(joinEnabled && !eventParticipation);
      res.locals.embedStreamer = liveUsers.length > 0 ? shuffle(liveUsers)[0] : undefined;
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
      .catch(logErrorAnd(() => context.eventsTimeline = [])));

  // Gather featured entries during the voting phase
  if (featuredEvent && [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE]
    .includes(featuredEvent.get("status_results"))) {
    contextTasks.push(
      entryService.findEntries({
        eventId: featuredEvent.get("id"),
        pageSize: 3,
        notReviewedById: user ? user.get("id") : undefined,
      })
        .then((suggestedEntriesCollection: BookshelfCollectionOf<EntryBookshelfModel>) => {
          context.suggestedEntries = suggestedEntriesCollection.models;
        })
        .catch(logErrorAnd(() => context.suggestedEntries = [])));
  }

  // Gather posts and comments
  contextTasks.push(
    postService.findPosts({ specialPostType: null })
      .then(async (postsCollection) => {
        await postsCollection.load(["entry", "event", "entry.userRoles"]);
        context.posts = postsCollection.models;
        context.pageCount = postsCollection.pagination.pageCount;
      })
      .catch(logErrorAnd(() => {
        context.posts = [];
        context.pageCount = 0;
      })));
  contextTasks.push(
    commentService.findLatestComments({ limit: 10 })
      .then(comments => context.comments = comments)
      .catch(logErrorAnd(() => context.comments = [])));

  // Find featured post
  contextTasks.push(
    settings.findNumber(SETTING_FEATURED_POST_ID, 0)
      .then(async (featuredPostId) => {
        if (featuredPostId) {
          context.featuredPost = await postService.findPostById(featuredPostId);
        }
      })
      .catch(log.error));

  // Find jumbo stream
  contextTasks.push(
    settings.find(SETTING_FEATURED_TWITCH_CHANNEL)
      .then((jumboStream) => context.jumboStream = jumboStream)
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
