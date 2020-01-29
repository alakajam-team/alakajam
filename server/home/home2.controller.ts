
import { BookshelfCollection, BookshelfModel, EntryBookshelfModel, PostBookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import cache from "server/core/cache";
import enums from "server/core/enums";
import log from "server/core/log";
import { logErrorAndReturn } from "server/core/middleware";
import settings from "server/core/settings";
import { SETTING_FEATURED_POST_ID, SETTING_HOME_SHRINKED_JUMBO } from "server/core/settings-keys";
import { loadUserShortcutsContext } from "server/event/event.middleware";
import eventService from "server/event/event.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";

interface HomeContext {
  featuredPost?: PostBookshelfModel;
  shrinkedJumbo: boolean;
  featuredEventAnnouncement?: BookshelfModel;
  eventSchedule: BookshelfModel[];
  suggestedEntries: BookshelfModel[];
  posts: PostBookshelfModel[];
  pageCount: number;
}

/**
 * Home page
 */
export async function home2(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  let context = cache.general.get<HomeContext>("home_page");
  if (!context) {
    context = await loadHomeContext(res);
    cache.general.set("home_page", context, 10 /* 10 seconds */);
  }

  await loadUserShortcutsContext(res, res.locals.featuredEvent, { postFromAnyEvent: true });

  if (res.locals.user) {
    const allPostsInPage = [context.featuredEventAnnouncement, context.featuredPost].concat(context.posts);
    res.locals.userLikes = await likeService.findUserLikeInfo(allPostsInPage as PostBookshelfModel[], res.locals.user);
  }

  res.render("home/home2", context);
}

async function loadHomeContext(res: CustomResponse<CommonLocals>): Promise<HomeContext> {
  const context: Partial<HomeContext> = {};
  const contextTasks: Array<Promise<any>> = [];

  // Find latest announcement for featured event
  if (res.locals.featuredEvent) {
    contextTasks.push(
      postService.findLatestAnnouncement({ eventId: res.locals.featuredEvent.get("id") })
        .then((announcement) => { context.featuredEventAnnouncement = announcement; })
        .catch(log.error));
  }

  // Fetch event schedule (preferably without displaying too many events after the featured one)
  contextTasks.push(
    loadEventSchedule(res.locals.featuredEvent)
    .then((eventSchedule) => { context.eventSchedule = eventSchedule; })
    .catch(logErrorAndReturn([])));

  // Gather featured entries during the voting phase
  if (res.locals.featuredEvent && [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE]
    .includes(res.locals.featuredEvent.get("status_results"))) {
    contextTasks.push(
      eventService.findGames({
        eventId: res.locals.featuredEvent.get("id"),
        pageSize: 4,
        notReviewedById: res.locals.user ? res.locals.user.get("id") : undefined,
      })
        .then((suggestedEntriesCollection: BookshelfCollection) => {
          context.suggestedEntries = suggestedEntriesCollection.models;
        })
        .catch(logErrorAndReturn([])));
  }

  // Gather user posts
  contextTasks.push(
    postService.findPosts({ specialPostType: null })
      .then(async (postsCollection) => {
        await postsCollection.load(["entry", "event", "entry.userRoles"]);
        context.posts = postsCollection.models;
        context.pageCount = postsCollection.pagination.pageCount;
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

  // Find whether to shrink the jumbo
  // TODO Remove?
  contextTasks.push(
    settings.find(SETTING_HOME_SHRINKED_JUMBO, "false")
      .then((value) => context.shrinkedJumbo = value.toLowerCase() === "true")
      .catch(log.error));

  // Fetch all the things at once!
  await Promise.all(contextTasks);

  return context as HomeContext;
}

async function loadEventSchedule(featuredEvent?: BookshelfModel): Promise<BookshelfModel[]> {
  if (featuredEvent) {
    let featuredEventIndex;
    let fetchedEventsCollection;
    let eventSchedule = [];
    let page = 1;
    do {
      fetchedEventsCollection = await eventService.findEvents({ pageSize: 10, page: page++ });
      eventSchedule = eventSchedule.concat(fetchedEventsCollection.models);
      featuredEventIndex = eventSchedule.findIndex((event) => event.get("id") === featuredEvent.get("id"));
      // Make sure we have the featured event + at least one past event (or we have run out of events)
    } while ((featuredEventIndex === -1 || featuredEventIndex >= eventSchedule.length - 1)
      && fetchedEventsCollection.length > 0);

    const startIndex = Math.max(0, featuredEventIndex - 2);
    return eventSchedule.slice(startIndex, startIndex + 5);
  } else {
    const fetchedEventsCollection = await eventService.findEvents({ pageSize: 5 });
    return fetchedEventsCollection.models;
  }
}
