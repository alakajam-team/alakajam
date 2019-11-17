
import { BookshelfCollection } from "bookshelf";
import cache from "server/core/cache";
import constants from "server/core/constants";
import enums from "server/core/enums";
import settings from "server/core/settings";
import { handleEventUserShortcuts } from "server/event/event.middleware";
import eventService from "server/event/event.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";

/**
 * Home page
 */
export async function home(req, res) {
  let context = cache.general.get<any>("home_page");

  if (!context) {
    context = {};

    let featuredAnnouncementTask;
    if (res.locals.featuredEvent) {
      // Find latest announcement for featured event
      featuredAnnouncementTask = postService.findLatestAnnouncement({ eventId: res.locals.featuredEvent.get("id") })
        .then((announcement) => { context.featuredEventAnnouncement = announcement; })
        .catch(res.traceAndShowErrorPage);
    }

    // Fetch event schedule (preferably without displaying too many events after the featured one)
    if (res.locals.featuredEvent) {
      let featuredEventIndex;
      let fetchedEventsCollection;
      let eventSchedule = [];
      let page = 1;
      do {
        fetchedEventsCollection = await eventService.findEvents({ pageSize: 10, page: page++ });
        eventSchedule = eventSchedule.concat(fetchedEventsCollection.models);
        featuredEventIndex = eventSchedule.findIndex((event) => event.get("id") === res.locals.featuredEvent.get("id"));
        // Make sure we have the featured event + at least one past event (or we have run out of events)
      } while ((featuredEventIndex === -1 || featuredEventIndex >= eventSchedule.length - 1)
        && fetchedEventsCollection.length > 0);

      const startIndex = Math.max(0, featuredEventIndex - 2);
      context.eventSchedule = eventSchedule.slice(startIndex, startIndex + 5);
    } else {
      const fetchedEventsCollection = await eventService.findEvents({ pageSize: 5 });
      context.eventSchedule = fetchedEventsCollection.models;
    }

    // Gather featured entries
    let suggestedEntriesTask = null;
    if (res.locals.featuredEvent && [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE]
      .includes(res.locals.featuredEvent.get("status_results"))) {
      suggestedEntriesTask = eventService.findGames({
        eventId: res.locals.featuredEvent.get("id"),
        pageSize: 4,
        notReviewedById: res.locals.user ? res.locals.user.get("id") : undefined,
      }).then((suggestedEntriesCollection: BookshelfCollection) => {
        context.suggestedEntries = suggestedEntriesCollection.models;
      })
        .catch(res.traceAndShowErrorPage);
    }

    // Gather any user posts
    const postsTask = postService.findPosts({ specialPostType: null })
      .then(async (postsCollection) => {
        await postsCollection.load(["entry", "event", "entry.userRoles"]);
        context.posts = postsCollection.models;
        context.pageCount = postsCollection.pagination.pageCount;
      })
      .catch(res.traceAndShowErrorPage);

    // Find featured post
    const featuredPostTask = settings.find(constants.SETTING_FEATURED_POST_ID)
      .then(async (featuredPostId) => {
        if (featuredPostId) {
          context.featuredPost = await postService.findPostById(featuredPostId);
        }
      })
      .catch(res.traceAndShowErrorPage);

    const shrinkedJumboSettingTask = settings.findNumber(constants.SETTING_HOME_SHRINKED_JUMBO, 0)
      .then((value) => context.shrinkedJumbo = value)
      .catch(res.traceAndShowErrorPage);

    // Parallelize fetching everything
    await Promise.all([
      featuredAnnouncementTask,
      suggestedEntriesTask,
      postsTask,
      featuredPostTask,
      shrinkedJumboSettingTask
    ]);

    cache.general.set("home_page", context, 10 /* 10 seconds */);
  }

  await handleEventUserShortcuts(res, res.locals.featuredEvent, { postFromAnyEvent: true });

  if (res.locals.user) {
    const allPagePosts = [context.featuredEventAnnouncement, context.featuredPost].concat(context.posts);
    res.locals.userLikes = await likeService.findUserLikeInfo(allPagePosts, res.locals.user);
  }

  res.render("home/home", context);
}
