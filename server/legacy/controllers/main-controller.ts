
/**
 * Global pages
 *
 * @module controllers/main-controller
 */

import fileStorage from "server/core/file-storage";
import cache from "../../core/cache";
import constants from "../../core/constants";
import enums from "../../core/enums";
import forms from "../../core/forms";
import security from "../../core/security";
import eventRatingService from "../services/event-rating-service";
import eventService from "../services/event-service";
import likeService from "../services/like-service";
import notificationService from "../services/notification-service";
import platformService from "../services/platform-service";
import postService from "../services/post-service";
import settingService from "../services/setting-service";
import userService from "../services/user-service";
import eventController from "./event-controller";

export default {
  anyPageMiddleware,

  home,
  events,
  games,
  people,
  peopleMods,
  chat,
  changes,
};

async function anyPageMiddleware(req, res, next) {
  res.locals.path = req.originalUrl;

  // Fetch current user
  let userTask = null;
  if (req.session.userId) {
    userTask = userService.findById(req.session.userId).then((user) => {
      res.locals.user = user;

      // Fetch comment to edit
      if (req.query.editComment && forms.isId(req.query.editComment)) {
        return postService.findCommentById(req.query.editComment).then(async (comment) => {
          if (comment && (security.canUserWrite(user, comment, { allowMods: true }) ||
              await postService.isOwnAnonymousComment(comment, user))) {
            res.locals.editComment = comment;
          }
        });
      }
    });
  }

  // Fetch featured event
  const featuredEventTask = settingService.find(constants.SETTING_FEATURED_EVENT_NAME)
    .then((featuredEventName) => {
      if (featuredEventName) {
        return eventService.findEventByName(featuredEventName);
      }
    }).then((featuredEvent) => {
      if (featuredEvent) {
        res.locals.featuredEvent = featuredEvent;
      }
    });

  await Promise.all([featuredEventTask, userTask]); // Parallelize fetching both

  // Update unread notifications, from cache if possible
  if (res.locals.user && res.locals.path !== "/dashboard/feed") {
    res.locals.unreadNotifications = await notificationService.countUnreadNotifications(res.locals.user);
  }

  next();
}

/**
 * Home page
 */
async function home(req, res) {
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
      }).then((suggestedEntriesCollection) => {
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
    const featuredPostTask = settingService.find(constants.SETTING_FEATURED_POST_ID)
      .then(async (featuredPostId) => {
        if (featuredPostId) {
          context.featuredPost = await postService.findPostById(featuredPostId);
        }
      })
      .catch(res.traceAndShowErrorPage);

    // Parallelize fetching everything
    await Promise.all([featuredAnnouncementTask, suggestedEntriesTask, postsTask, featuredPostTask]);

    cache.general.set("home_page", context, 10 /* 10 seconds */);
  }

  await eventController.handleEventUserShortcuts(res, res.locals.featuredEvent);

  if (res.locals.user) {
    const allPagePosts = [context.featuredEventAnnouncement, context.featuredPost].concat(context.posts);
    res.locals.userLikes = await likeService.findUserLikeInfo(allPagePosts, res.locals.user);
  }

  res.render("index", context);
}

/**
 * Events listing
 */
async function events(req, res) {
  res.locals.pageTitle = "Events";

  const pending = [];
  const open = [];
  const closedAlakajam = [];
  const closedOther = [];

  const allEventsCollection = await eventService.findEvents();

  // Group entries by status, gather featured entries
  const featuredEntries = {};
  for (const event of allEventsCollection.models) {
    switch (event.get("status")) {
      case enums.EVENT.STATUS.PENDING:
        pending.unshift(event); // sort by ascending dates
        break;
      case enums.EVENT.STATUS.OPEN:
        open.push(event);
        break;
      default:
        if (event.get("status_theme") !== enums.EVENT.STATUS_THEME.DISABLED) {
          closedAlakajam.push(event);
        } else {
          closedOther.push(event);
        }

        if (event.get("status_results") === enums.EVENT.STATUS_RESULTS.RESULTS) {
          const topEntries = await eventService.findGames({
            eventId: event.get("id"),
            sortByRanking: true,
            pageSize: 6,
            withRelated: ["details", "userRoles"],
          });
          const topEntriesByDivision = {};
          topEntries.forEach((entry) => {
            const division = entry.get("division");
            if (!topEntriesByDivision[division]) {
              topEntriesByDivision[division] = [];
            }
            if (topEntriesByDivision[division].length < 3 && entry.related("details").get("ranking_1")) {
              topEntriesByDivision[division].push(entry);
            }
          });
          featuredEntries[event.get("id")] = topEntriesByDivision;
        }
    }
  }

  res.render("events", {
    pending,
    open,
    closedAlakajam,
    closedOther,
    featuredEntries,
  });
}

/**
 * Game browser
 */
async function games(req, res) {
  res.locals.pageTitle = "Games";

  const { user, featuredEvent } = res.locals;

  // Parse query
  const searchOptions: any = await eventController.handleGameSearch(req, res);

  // Fetch info
  // TODO Parallelize tasks
  let rescueEntries = [];
  let requiredVotes = null;
  if (featuredEvent && featuredEvent.get("status_results") === "voting_rescue") {
    const canVoteInEvent = await eventRatingService.canVoteInEvent(user, featuredEvent);
    if (canVoteInEvent || security.isMod(user)) {
      rescueEntries = (await eventService.findRescueEntries(featuredEvent, user)).models;
      requiredVotes = await settingService.findNumber(constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, 10);
    }
  }
  const entriesCollection = await eventService.findGames(searchOptions);
  const platformCollection = await platformService.fetchAll();

  const eventsCollection = await eventService.findEvents();
  let searchedEvent = null;
  if (searchOptions.eventId) {
    searchedEvent = eventsCollection.findWhere({ id: parseInt(searchOptions.eventId, 10) });
  }

  res.render("games", {
    searchOptions,
    searchedEvent,
    entriesCollection,
    rescueEntries,
    requiredVotes,
    events: eventsCollection.models,
    platforms: platformCollection.models,
  });
}

/**
 * People listing
 */
async function people(req, res) {
  res.locals.pageTitle = "People";

  const PAGE_SIZE = 30;

  // Parse query
  let currentPage = 1;
  if (forms.isId(req.query.p)) {
    currentPage = parseInt(req.query.p, 10);
  }
  const searchOptions: any = {
    pageSize: PAGE_SIZE,
    page: currentPage,
    withEntries: req.query.withEntries,
    entriesCount: true,
  };
  searchOptions.search = forms.sanitizeString(req.query.search);
  if (req.query.eventId === "none") {
    searchOptions.eventId = null;
  } else {
    searchOptions.eventId = forms.isId(req.query.eventId) ? req.query.eventId : undefined;
  }

  // Fetch info
  const usersCollection = await userService.findUsers(searchOptions);
  const eventsCollection = await eventService.findEvents({ statusNot: enums.EVENT.STATUS.PENDING });
  let searchedEvent = null;
  if (searchOptions.eventId) {
    searchedEvent = eventsCollection.findWhere({ id: parseInt(searchOptions.eventId, 10) });
  }

  res.render("people", {
    searchOptions,
    searchedEvent,
    users: usersCollection.sortBy((user) => -user.get("id")),
    userCount: usersCollection.pagination.rowCount,
    pageCount: usersCollection.pagination.pageCount,
    currentPage,
    events: eventsCollection.models,
  });
}

async function peopleMods(req, res) {
  res.locals.pageTitle = "Admins & mods";

  const adminsCollection = await userService.findUsers({ isAdmin: true, orderBy: "title" });
  const modsCollection = await userService.findUsers({ isMod: true, orderBy: "title" });
  modsCollection.remove(adminsCollection.models);

  res.render("people-mods", {
    mods: modsCollection.models,
    admins: adminsCollection.models,
  });
}

/**
 * IRC Chat
 */
async function chat(req, res) {
  res.locals.pageTitle = "Chat";

  res.render("chat");
}

/**
 * Changelog
 */
async function changes(req, res) {
  res.locals.pageTitle = "Site changes";
  res.locals.changes = await fileStorage.read("CHANGES.md");

  res.render("changes", {
    sidebar: await settingService.findArticlesSidebar(),
  });
}
