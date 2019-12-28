
/**
 * Service for interacting with events & entries.
 *
 * @module services/event-service
 */

import * as Bluebird from "bluebird";
import { BookshelfCollection, BookshelfModel, EntryBookshelfModel, FetchAllOptions, FetchPageOptions, SortOrder } from "bookshelf";
import cache from "server/core/cache";
import config, { ilikeOperator } from "server/core/config";
import constants from "server/core/constants";
import db from "server/core/db";
import enums from "server/core/enums";
import fileStorage from "server/core/file-storage";
import { createLuxonDate } from "server/core/formats";
import * as models from "server/core/models";
import settings from "server/core/settings";
import postService from "server/post/post.service";

export default {
  createEvent,
  areSubmissionsAllowed,
  getDefaultDivision,
  findEventById,
  findEventByName,
  findEventByStatus,
  findEvents,

  createEventTemplate,
  findEventTemplates,
  findEventTemplateById,
  deleteEventTemplate,

  createEntry,
  setEntryPicture,
  searchForExternalEvents,
  deleteEntry,

  findGames,
  findLatestEntries,
  findEntryById,
  findLatestUserEntry,
  findUserEntries,
  findUserEntryForEvent,
  findEntryInvitesForUser,
  findRescueEntries,
  countEntriesByEvent,

  refreshCommentKarma,
  refreshEventReferences,
  refreshEntryPlatforms,
  refreshUserCommentKarmaOnNode,
  refreshEventCounts,
};

/**
 * Creates a new empty event
 * @param {EventTemplate} template An optional template to initialize the event with
 * @return {Event}
 */
function createEvent(template = null) {
  const event = new models.Event({
    status: enums.EVENT.STATUS.PENDING,
    status_rules: enums.EVENT.STATUS_RULES.OFF,
    status_theme: enums.EVENT.STATUS_THEME.DISABLED,
    status_entry: enums.EVENT.STATUS_ENTRY.OFF,
    status_results: enums.EVENT.STATUS_RESULTS.DISABLED,
    status_tournament: enums.EVENT.STATUS_TOURNAMENT.DISABLED,
    divisions: {
      solo: "48 hours<br />Everything from scratch",
      team: "48 hours<br />Everything from scratch",
      unranked: "72 hours<br />No rankings, just feedback",
    },
  });
  if (template) {
    event.set({
      title: template.get("event_title"),
      event_preset_id: template.get("event_preset_id"),
      divisions: template.get("divisions") || event.get("divisions"),
    });
    const details = event.related("details") as BookshelfModel;
    details.set({
      links: template.get("links"),
      category_titles: template.get("category_titles"),
    });
  }
  return event;
}

function areSubmissionsAllowed(event) {
  return event && event.get("status") === enums.EVENT.STATUS.OPEN &&
      ([enums.EVENT.STATUS_ENTRY.OPEN, enums.EVENT.STATUS_ENTRY.OPEN_UNRANKED].includes(event.get("status_entry")));
}

function getDefaultDivision(event) {
  return Object.keys(event.get("divisions"))[0];
}

/**
 * Fetches an models.Event by its ID, with all its Entries.
 * @param id {id} models.Event ID
 * @returns {Event}
 */
async function findEventById(id) {
  if (!cache.eventsById.get(id)) {
    const event = await models.Event.where("id", id)
      .fetch({ withRelated: ["details"] });
    cache.eventsById.set(id, event);
  }
  return cache.eventsById.get(id);
}

/**
 * Fetches an models.Event by its name, with all its Entries.
 * @param id {id} models.Event name
 * @returns {Event}
 */
async function findEventByName(name) {
  if (!cache.eventsByName.get(name)) {
    const event = await models.Event.where("name", name)
      .fetch({ withRelated: ["details"] });
    cache.eventsByName.set(name, event);
  }
  return cache.eventsByName.get<any>(name);
}

/**
 * Fetches all models.Events and their Entries.
 * @param {object} options Allowed: status name sortDatesAscending
 * @returns {array(Event)}
 */
async function findEvents(options: {
    name?: string,
    status?: string,
    statusNot?: string,
    ignoreTournaments?: boolean
    sortDatesAscending?: "ASC" | "DESC",
    pageSize?: number,
    page?: number
  } & FetchAllOptions = {}): Promise<BookshelfCollection> {
  let query = new models.Event()
    .orderBy("started_at", options.sortDatesAscending ? "ASC" : "DESC") as BookshelfModel;
  if (options.status) { query = query.where("status", options.status); }
  if (options.statusNot) { query = query.where("status", "<>", options.statusNot); }
  if (options.name) { query = query.where("name", options.name); }
  if (options.ignoreTournaments) {
    query = query.where("status_tournament", "=", enums.EVENT.STATUS_TOURNAMENT.DISABLED);
  }
  if (options.pageSize) {
    return query.fetchPage(options);
  } else {
    return query.fetchAll(options) as Bluebird<BookshelfCollection>;
  }
}

/**
 * Fetches the currently live models.Event.
 * @param globalStatus {string} One of "pending", "open", "closed"
 * @returns {Event} The earliest pending event OR the currently open event OR the last closed event.
 */
async function findEventByStatus(status) {
  let sortOrder: SortOrder = "ASC";
  if (status === enums.EVENT.STATUS.CLOSED) {
    sortOrder = "DESC";
  }
  return models.Event.where("status", status)
    .orderBy("started_at", sortOrder)
    .fetch();
}

/**
 * Creates an empty, unpersisted event template.
 */
function createEventTemplate() {
  return new models.EventTemplate();
}

/**
 * Finds all event templates.
 */
async function findEventTemplates(): Promise<BookshelfCollection> {
  return new models.EventTemplate()
    .orderBy("title")
    .fetchAll() as Bluebird<BookshelfCollection>;
}

/**
 * Finds an event template.
 * @param {number} id
 */
async function findEventTemplateById(id) {
  return models.EventTemplate.where({ id }).fetch();
}

/**
 * Deletes an event template.
 * @param {EventTemplate} eventTemplate
 */
async function deleteEventTemplate(eventTemplate) {
  return eventTemplate.destroy();
}

/**
 * Creates and persists a new entry, initializing the owner UserRole.
 * @param  {User} user
 * @param  {Event} event
 * @return {Entry}
 */
async function createEntry(user, event): Promise<EntryBookshelfModel> {
  const entry = new models.Entry({
    name: "untitled",
    title: "",
    comment_count: 0,
    pictures: "{previews: []}",
  }) as EntryBookshelfModel;

  if (event) {
    const eventId = event.get("id");
    if (await findUserEntryForEvent(user, eventId)) {
      throw new Error("User already has an entry for this event");
    }
    entry.set({
      event_id: eventId,
      event_name: event.get("name"),
    });
  }

  await entry.save(); // otherwise the user role won't have a node_id

  const userRoles = entry.related("userRoles") as BookshelfCollection;
  await userRoles.create({
    user_id: user.get("id"),
    user_name: user.get("name"),
    user_title: user.get("title"),
    event_id: event ? event.get("id") : null,
    permission: constants.PERMISSION_MANAGE,
  });

  const entryDetails = new models.EntryDetails({
    entry_id: entry.get("id"),
  });
  await entryDetails.save();
  await entry.load("details");

  // Attach posts from same event
  if (event) {
    await postService.attachPostsToEntry(event.get("id"), user.get("id"), entry.get("id"));
  }
  return entry;
}

/**
 * Sets the entry picture and generates its thumbnails
 * @param {Entry} entry
 * @param {object|string} file The form upload
 */
async function setEntryPicture(entry, file) {
  const picturePath = "/entry/" + entry.get("id");
  const result = await fileStorage.savePictureUpload(file, picturePath, constants.PICTURE_OPTIONS_DEFAULT);
  if (!result.error) {
    entry.set("updated_at", createLuxonDate().toJSDate());
    // Thumbnails creation
    let resultThumbnail;
    if (result && result.width >= result.height * 1.1) {
      resultThumbnail = await fileStorage.savePictureUpload(file, picturePath, constants.PICTURE_OPTIONS_THUMB);
    } else {
      resultThumbnail = await fileStorage.savePictureUpload(file, picturePath,
        constants.PICTURE_OPTIONS_THUMB_PORTRAIT);
    }
    const resultIcon = await fileStorage.savePictureUpload(file, picturePath, constants.PICTURE_OPTIONS_ICON);

    // Delete previous pictures (in case of a different extension)
    if (entry.picturePreviews().length > 0 && result.finalPath !== entry.picturePreviews()[0]) {
      await fileStorage.remove(entry.picturePreviews()[0]);
    }
    if (entry.pictureThumbnail() && resultThumbnail.finalPath !== entry.pictureThumbnail()) {
      await fileStorage.remove(entry.pictureThumbnail());
    }
    if (entry.pictureIcon() && resultIcon.finalPath !== entry.pictureIcon()) {
      await fileStorage.remove(entry.pictureIcon());
    }

    entry.set("pictures", {
      previews: [result.finalPath],
      thumbnail: resultThumbnail.finalPath,
      icon: resultIcon.finalPath
    });
  }
  return result;
}

/**
 * Searches for any external event name already submitted
 * @param  {string} nameFragment
 * @return {array(string)} external event names
 */
async function searchForExternalEvents(nameFragment) {
  const results = await db.knex("entry")
    .distinct()
    .select("external_event")
    .where("external_event", ilikeOperator(), `%${nameFragment}%`);

  const formattedResults = [];
  for (const result of results) {
    formattedResults.push(result.external_event);
  }
  formattedResults.sort((a, b) => {
    return a.localeCompare(b);
  });
  return formattedResults;
}

async function deleteEntry(entry) {
  // Unlink posts (not in transaction to prevent foreign key errors)
  const posts = await postService.findPosts({ entryId: entry.get("id") });
  posts.forEach(async (post) => {
    post.set("entry_id", null);
    await post.save();
  });

  await db.transaction(async (transaction) => {
    // Delete user roles & comments manually (because no cascading)
    await entry.load(["userRoles.user", "comments.user"], { transacting: transaction });

    const destroyQueries: Array<Promise<void>> = [];
    entry.related("userRoles").forEach((userRole) => {
      cache.user(userRole.related("user")).del("latestEntry");
      destroyQueries.push(userRole.destroy({ transacting: transaction }));
    });
    entry.related("comments").forEach((comment) => {
      cache.user(comment.related("user")).del("byUserCollection");
      destroyQueries.push(comment.destroy({ transacting: transaction }));
    });
    await Promise.all(destroyQueries);

    // Delete pictures
    if (entry.picturePreviews().length > 0) {
      await fileStorage.remove(entry.picturePreviews()[0]);
    }
    if (entry.pictureThumbnail()) {
      await fileStorage.remove(entry.pictureThumbnail());
    }
    if (entry.pictureIcon()) {
      await fileStorage.remove(entry.pictureIcon());
    }

    // Delete entry
    await entry.destroy({ transacting: transaction });
  });
}

/**
 * @param options {object} nameFragment eventId userId platforms tags pageSize page
 *                         withRelated notReviewedBy sortByRatingCount sortByRating sortByRanking
 */
async function findGames(
    options: {
      count?: boolean, sortByRatingCount?: boolean, sortByRating?: boolean, sortByRanking?: boolean, eventId?: number,
      search?: string, platforms?: string[], tags?: Array<{id: number}>, divisions?: string[], notReviewedById?: string,
      userId?: number, highScoresSupport?: boolean
    } & FetchPageOptions = {}): Promise<BookshelfCollection | number | string> {
  let query = new models.Entry().query((qb) => {
    return qb.leftJoin("entry_details", "entry_details.entry_id", "entry.id");
  }) as BookshelfModel;

  // Sorting
  if (!options.count) {
    if (options.sortByRatingCount) {
      query = query.query((qb) => {
        return qb.orderBy("entry_details.rating_count");
      });
    } else if (options.sortByRating) {
      query = query.query((qb) => {
        return qb.leftJoin("event", "entry.event_id", "event.id")
          .where(function() {
            this.where("event.status", enums.EVENT.STATUS.CLOSED).orWhereNull("event.status");
          })
          .orderByRaw("entry_details.rating_1 "
            + ((config.DB_TYPE === "postgresql") ? "DESC NULLS LAST" : "IS NULL DESC"))
          .orderBy("entry.karma", "DESC");
      });
    } else if (options.sortByRanking) {
      query = query.query((qb) => {
        return qb.leftJoin("event", "entry.event_id", "event.id")
          .where(function() {
            this.where("event.status", enums.EVENT.STATUS.CLOSED).orWhereNull("event.status");
          })
          .orderByRaw("entry_details.ranking_1 " + ((config.DB_TYPE === "postgresql") ? "NULLS LAST" : "IS NOT NULL"))
          .orderBy("entry.created_at", "DESC")
          .orderBy("entry.division");
      });
    } else if (options.eventId !== null) {
      query = query.orderBy("entry.karma", "DESC");
    }
    query = query.orderBy("entry.created_at", "DESC");
  }

  // Filters
  if (options.search) {
    query = query.where("entry.title", ilikeOperator(), `%${options.search}%`);
  }
  if (options.eventId !== undefined) { query = query.where("entry.event_id", options.eventId); }
  if (options.platforms) {
    query = query.query((qb) => {
      return qb.leftJoin("entry_platform", "entry_platform.entry_id", "entry.id")
        .whereIn("entry_platform.platform_id", options.platforms);
    });
  }
  if (options.tags) {
    query = query.query((qb) => {
      return qb.leftJoin("entry_tag", "entry_tag.entry_id", "entry.id")
        .whereIn("entry_tag.tag_id", options.tags.map((tag) => tag.id));
    });
  }
  if (options.divisions) {
    query = query.where("division", "in", options.divisions);
  }
  if (options.notReviewedById) {
    query = query.query((qb) => {
      qb = qb
        // Hide rated
        .leftJoin("entry_vote", function() {
          this.on("entry_vote.entry_id", "=", "entry.id")
            .andOn("entry_vote.user_id", "=", options.notReviewedById);
        })
        .whereNull("entry_vote.id")
        // Hide commented
        .where("entry.id", "NOT IN", db.knex("comment")
          .where({
            user_id: options.notReviewedById,
            node_type: "entry",
          })
          .select("node_id"));

      // If this option is set, this has already been done (to avoid multiple joins on same table)
      if (!options.userId) {
        // Hide own entry (not strictly requested, but sensible)
        qb = qb.leftJoin("user_role", function() {
          this.on("user_role.node_id", "=", "entry.id")
            .andOn("user_role.user_id", "=", options.notReviewedById);
        })
          .whereNull("user_role.id");
      }
      return qb;
    });
  }
  if (options.userId) {
    query = query.query((qb) => {
      qb = qb.innerJoin("user_role", "entry.id", "user_role.node_id")
        .where({
          "user_role.user_id": options.userId,
          "user_role.node_type": "entry",
        });
      // Hide own entry (not strictly requested, but sensible)
      if (options.notReviewedById) {
        qb.whereNot({
          "user_role.user_id": options.notReviewedById,
        });
      }
      return qb;
    });
  }
  if (options.highScoresSupport) {
    query = query.where("status_high_score", "!=", "off");
  }

  // Pagination settings
  if (options.pageSize === undefined) { options.pageSize = 30; }
  if (options.withRelated === undefined) { options.withRelated = ["event", "userRoles"]; }

  // Fetch
  if (options.count) {
    return query.count();
  } else if (options.pageSize) {
    return query.fetchPage(options);
  } else {
    return query.fetchAll(options) as Bluebird<BookshelfCollection>;
  }
}

/**
 * Fetches the latest entries of any event
 * @param id {id} models.Entry ID
 * @returns {Entry}
 */
async function findLatestEntries() {
  return models.Entry.query((qb) => {
    return qb.whereNotNull("event_id");
  })
    .orderBy("created_at", "DESC")
    .fetchPage({
      pageSize: 4,
      withRelated: ["userRoles", "event"],
    });
}

/**
 * Fetches an models.Entry by its ID.
 * @param id {id} models.Entry ID
 * @returns {Entry}
 */
async function findEntryById(id, options: any = {}): Promise<EntryBookshelfModel> {
  if (!options.withRelated) {
    options.withRelated = ["details", "event", "userRoles", "tags"];
  }
  return models.Entry.where("id", id).fetch(options) as Bluebird<EntryBookshelfModel>;
}

/**
 * Retrieves all the entries an user contributed to
 * @param  {User} user
 * @return {array(Entry)|null}
 */
async function findUserEntries(user): Promise<BookshelfCollection> {
  const entriesCollection = await models.Entry.query((qb) => {
    qb.distinct()
      .innerJoin("user_role", "entry.id", "user_role.node_id")
      .where({
        "user_role.user_id": user.get("id"),
        "user_role.node_type": "entry",
      });
  })
    .orderBy("published_at", "desc")
    .orderBy("external_event", "desc")
    .fetchAll({ withRelated: ["userRoles", "event"] });

  // Move entries without a publication date to the end (otherwise nulls would be first)
  const entriesWithoutPublicationDate = entriesCollection.filter((entry) => !entry.get("published_at"));
  return new db.Collection(entriesCollection
    .filter((entry) => !entriesWithoutPublicationDate.includes(entry))
    .concat(entriesWithoutPublicationDate)) as BookshelfCollection;
}

/**
 * Retrieves the user's latest entry
 * @param  {User} user
 * @return {Entry|null}
 */
async function findLatestUserEntry(user, options: any = {}) {
  if (!options.withRelated) {
    options.withRelated = ["userRoles", "event"];
  }

  return models.Entry.query((qb) => {
    qb.distinct()
      .innerJoin("user_role", "entry.id", "user_role.node_id")
      .whereNotNull("entry.event_id")
      .where({
        "user_role.user_id": user.get("id"),
        "user_role.node_type": "entry",
      });
  })
    .orderBy("created_at", "desc")
    .fetch(options);
}

/**
 * Retrieves the entry a user submitted to an event
 * @param  {User} user
 * @param  {integer} eventId
 * @return {Entry|null}
 */
async function findUserEntryForEvent(user, eventId) {
  return models.Entry.query((query) => {
    query.innerJoin("user_role", "entry.id", "user_role.node_id")
      .where({
        "entry.event_id": eventId,
        "user_role.user_id": user.get("id"),
        "user_role.node_type": "entry",
      });
  }).fetch({ withRelated: ["userRoles"] });
}

async function findEntryInvitesForUser(user, options): Promise<BookshelfCollection> {
  let notificationsLastRead = new Date(0);
  if (options.notificationsLastRead && user.get("notifications_last_read") !== undefined) {
    notificationsLastRead = new Date(user.get("notifications_last_read"));
  }

  return models.EntryInvite
    .where("invited_user_id", user.get("id"))
    .where("created_at", ">", notificationsLastRead as any)
    .fetchAll(options) as Bluebird<BookshelfCollection>;
}

async function findRescueEntries(event, user, options: any = {}) {
  const minRatings = await settings.findNumber(constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, 10);

  if (options.pageSize === undefined) { options.pageSize = 4; }
  if (options.withRelated === undefined) { options.withRelated = ["details", "userRoles"]; }

  return models.Entry.where("entry.event_id", event.get("id"))
    .where("division", "<>", enums.DIVISION.UNRANKED)
    .query((qb) => {
      return qb.leftJoin("entry_details", "entry_details.entry_id", "entry.id")
        // do not rescue those who really didn't participate
        .where("entry_details.rating_count", ">", Math.floor(minRatings / 4))
        .where("entry_details.rating_count", "<", minRatings)
        .leftJoin("entry_vote", function() {
          this.on("entry_vote.entry_id", "=", "entry.id")
            .andOn("entry_vote.user_id", "=", user.get("id"));
        })
        .whereNull("entry_vote.id"); // hide rated games
    })
    .orderBy("entry_details.rating_count", "desc")
    .orderBy("entry.karma", "desc")
    .fetchPage(options);
}

async function countEntriesByEvent(event) {
  const count = await models.Entry
    .where("event_id", event.get("id"))
    .count();
  return parseInt(count.toString(), 10);
}

/**
 * Refreshes various models that cache the event name.
 * Call this after changing the name of an event.
 * @param {Event} event
 */
async function refreshEventReferences(event) {
  // TODO Transaction
  const entryCollection = await models.Entry.where("event_id", event.id).fetchAll() as BookshelfCollection;
  for (const entry of entryCollection.models) {
    entry.set("event_name", event.get("name"));
    await entry.save();
  }
}

async function refreshEntryPlatforms(entry) {
  const tasks = [];
  await entry.load("platforms");
  entry.related("platforms").forEach(async (platform) => {
    tasks.push(platform.destroy());
  });
  const platformStrings = entry.get("platforms");
  if (platformStrings) {
    for (const platformString of platformStrings) {
      const platform = new models.EntryPlatform({
        entry_id: entry.get("id"),
        platform: platformString,
      });
      tasks.push(platform.save());
    }
  }
  await Promise.all(tasks);
}

async function refreshCommentKarma(comment) {
  await comment.load(["node.comments", "node.userRoles"]);

  let isTeamMember = false;
  const entry = comment.related("node");
  const entryUserRoles = entry.related("userRoles");
  for (const userRole of entryUserRoles.models) {
    if (userRole.get("user_id") === comment.get("user_id")) {
      isTeamMember = true;
      break;
    }
  }

  let adjustedScore = 0;
  if (!isTeamMember) {
    const rawScore = _computeRawCommentKarma(comment);

    let previousCommentsScore = 0;
    const entryComments = entry.related("comments");
    for (const entryComment of entryComments.models) {
      if (entryComment.get("user_id") === comment.get("user_id") && entryComment.get("id") !== comment.get("id")) {
        previousCommentsScore += entryComment.get("karma");
      }
    }
    adjustedScore = Math.max(0, Math.min(rawScore, 3 - previousCommentsScore));
  }

  comment.set("karma", adjustedScore);
}

/**
 * Refreshes the scores of all the comments written by an user on an entry.
 * Useful to detect side-effects of a user modifying or deleting a comment.
 * @param {integer} userId The user id of the modified comment
 * @param {Post|Entry} node
 */
async function refreshUserCommentKarmaOnNode(node, userId) {
  await node.load(["comments", "userRoles"]);
  let isTeamMember = false;

  const entryUserRoles = node.related("userRoles");
  for (const userRole of entryUserRoles.models) {
    if (userRole.get("user_id") === userId) {
      isTeamMember = true;
      break;
    }
  }

  if (!isTeamMember) {
    let previousCommentsScore = 0;
    const entryComments = node.related("comments");
    for (const comment of entryComments.models) {
      if (comment.get("user_id") === userId) {
        let adjustedScore = 0;
        if (previousCommentsScore < 3) {
          const rawScore = _computeRawCommentKarma(comment);
          adjustedScore = Math.max(0, Math.min(rawScore, 3 - previousCommentsScore));
          previousCommentsScore += adjustedScore;
        }
        comment.set("karma", adjustedScore);
        await comment.save();
      }
    }
  }
}

function _computeRawCommentKarma(comment) {
  const commentLength = comment.get("body").length;
  if (commentLength > 300) { // Elaborate comments
    return 3;
  } else if (commentLength > 100) { // Interesting comments
    return 2;
  } else { // Short comments
    return 1;
  }
}

/**
 * Updates the event counters on an event
 * @param  {Event} event
 * @return {void}
 */
async function refreshEventCounts(event: BookshelfModel) {
  const countByDivision = await db.knex("entry")
    .count("* as count").select("division")
    .where("event_id", event.get("id"))
    .where("published_at", "<=", createLuxonDate().toJSDate())
    .groupBy("division");

  let totalCount = 0;
  const divisionCounts = {};
  for (const row of countByDivision) {
    const count = parseInt(row.count as string, 10);
    divisionCounts[row.division] = count;
    totalCount += count;
  }
  if (!event.relations.details) {
    await event.load("details");
  }

  return db.transaction(async (transaction) => {
    event.set("entry_count", totalCount);
    await event.save(null, { transacting: transaction });

    const details = event.related("details") as BookshelfModel;
    details.set("division_counts", divisionCounts);
    await details.save(null, { transacting: transaction });

    cache.eventsById.del(event.get("id"));
    cache.eventsByName.del(event.get("name"));
  });
}
