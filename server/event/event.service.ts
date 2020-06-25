import * as Bluebird from "bluebird";
import {
  BookshelfCollection,
  BookshelfCollectionOf,
  BookshelfModel,
  EntryBookshelfModel,
  FetchAllOptions,
  FetchOptions,
  FetchPageOptions,
  SortOrder
} from "bookshelf";
import cache from "server/core/cache";
import config, { ilikeOperator } from "server/core/config";
import constants from "server/core/constants";
import db from "server/core/db";
import enums from "server/core/enums";
import fileStorage from "server/core/file-storage";
import { createLuxonDate } from "server/core/formats";
import * as models from "server/core/models";
import { SECURITY_PERMISSION_MANAGE } from "server/core/security";
import settings from "server/core/settings";
import { SETTING_EVENT_REQUIRED_ENTRY_VOTES } from "server/core/settings-keys";
import { User } from "server/entity/user.entity";
import postService from "server/post/post.service";
import { EventFlags } from "server/entity/event-details.entity";


/**
 * Service for managing events & entries.
 */
export class EventService {

  /**
   * Creates a new empty event
   * @param {EventTemplate} template An optional template to initialize the event with
   */
  public createEvent(template?: BookshelfModel): BookshelfModel {
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
    }) as BookshelfModel;
    if (template) {
      event.set({
        title: template.get("event_title"),
        event_preset_id: template.get("event_preset_id"),
        divisions: template.get("divisions") || event.get("divisions"),
      });
      const details = event.related<BookshelfModel>("details");
      details.set({
        links: template.get("links"),
        category_titles: template.get("category_titles"),
      });
    }
    return event;
  }

  public areSubmissionsAllowed(event: BookshelfModel): boolean {
    return [enums.EVENT.STATUS_ENTRY.OPEN, enums.EVENT.STATUS_ENTRY.OPEN_UNRANKED].includes(event.get("status_entry"));
  }

  public getDefaultDivision(event: BookshelfModel): string {
    return Object.keys(event.get("divisions"))[0];
  }

  /**
   * @param categoryIndex must be 1-numbered
   */
  public getCategoryTitle(event: BookshelfModel, categoryIndex: number): string | undefined {
    const eventDetails = event.related<BookshelfModel>("details");
    const categoryTitles = eventDetails.get("category_titles");
    const flags = eventDetails.get("flags") as EventFlags;
    if (categoryTitles.length > categoryIndex - 1) {
      return categoryTitles[categoryIndex - 1];
    } else if (flags.scoreSpacePodium && categoryIndex === 7) {
      return "ScoreSpace Awards";
    }
  }

  /**
   * Fetches an models.Event by its ID, with all its Entries.
   */
  public async findEventById(id: number): Promise<BookshelfModel> {
    if (!cache.eventsById.get(id)) {
      const event = await models.Event.where("id", id)
        .fetch({ withRelated: ["details"] });
      cache.eventsById.set(id, event);
    }
    return cache.eventsById.get<BookshelfModel>(id);
  }

  /**
   * Fetches an models.Event by its name, with all its Entries.
   */
  public async findEventByName(name: string): Promise<BookshelfModel> {
    if (!cache.eventsByName.get(name)) {
      const event = await models.Event.where("name", name)
        .fetch({ withRelated: ["details"] });
      cache.eventsByName.set(name, event);
    }
    return cache.eventsByName.get<BookshelfModel>(name);
  }

  /**
   * Fetches all models.Events and their Entries.
   */
  public async findEvents(options: {
    name?: string;
    status?: string;
    statusNot?: string;
    ignoreTournaments?: boolean;
    sortDatesAscending?: "ASC" | "DESC";
    pageSize?: number;
    page?: number;
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
   * @returns {Event} The earliest pending event OR the currently open event OR the last closed event.
   */
  public async findEventByStatus(status: "pending" | "open" | "closed"): Promise<BookshelfModel> {
    let sortOrder: SortOrder = "ASC";
    if (status === enums.EVENT.STATUS.CLOSED) {
      sortOrder = "DESC";
    }
    return models.Event.where("status", status)
      .orderBy("started_at", sortOrder)
      .fetch();
  }

  /**
   * Creates and persists a new entry, initializing the owner UserRole.
   */
  public async createEntry(user: User, event?: BookshelfModel): Promise<EntryBookshelfModel> {
    const entry = new models.Entry({
      name: "untitled",
      title: "",
      comment_count: 0,
      pictures: "{previews: []}",
    }) as EntryBookshelfModel;

    if (event) {
      const eventId = event.get("id");
      if (await this.findUserEntryForEvent(user, eventId)) {
        throw new Error("User already has an entry for this event");
      }
      entry.set({
        event_id: eventId,
        event_name: event.get("name"),
      });
    }

    await entry.save(); // otherwise the user role won't have a node_id

    const userRoles = entry.related<BookshelfCollection>("userRoles");
    await userRoles.create({
      user_id: user.get("id"),
      user_name: user.get("name"),
      user_title: user.get("title"),
      event_id: event ? event.get("id") : null,
      permission: SECURITY_PERMISSION_MANAGE,
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
  public async setEntryPicture(entry: EntryBookshelfModel, file: object | string) {
    const picturePath = "/entry/" + entry.get("id");
    const result = await fileStorage.savePictureUpload(file, picturePath, constants.PICTURE_OPTIONS_DEFAULT);
    if (!("error" in result)) {
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
   * @return {array(string)} external event names
   */
  public async searchForExternalEvents(nameFragment: string): Promise<string[]> {
    const results: Array<{ external_event: string }> = await db.knex("entry")
      .distinct()
      .select("external_event")
      .where("external_event", ilikeOperator(), `%${nameFragment}%`);

    const formattedResults: string[] = [];
    for (const result of results) {
      formattedResults.push(result.external_event);
    }
    formattedResults.sort((a, b) => {
      return a.localeCompare(b);
    });
    return formattedResults;
  }

  public async deleteEntry(entry: EntryBookshelfModel) {
    // Unlink posts (not in transaction to prevent foreign key errors)
    const posts = await postService.findPosts({ entryId: entry.get("id") });
    for (const post of posts.models) {
      post.set("entry_id", null);
      await post.save();
    }

    await db.transaction(async (transaction) => {
      // Delete user roles & comments manually (because no cascading)
      await entry.load(["userRoles.user", "comments.user"], { transacting: transaction } as any);

      const destroyQueries: Array<Promise<any>> = [];
      entry.related<BookshelfCollection>("userRoles").forEach((userRole) => {
        cache.user(userRole.related<any>("user")).del("latestEntry");
        destroyQueries.push(userRole.destroy({ transacting: transaction }));
      });
      entry.related<BookshelfCollection>("comments").forEach((comment) => {
        cache.user(comment.related<any>("user")).del("byUserCollection");
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

  public async findGames(options: FindGamesOptions = {}): Promise<BookshelfCollectionOf<EntryBookshelfModel> | number | string> {
    let query = new models.Entry()
      .query((qb) => {
        qb.leftJoin("entry_details", "entry_details.entry_id", "entry.id");
      }) as BookshelfModel;

    // Sorting
    if (!options.count) {
      if (options.sortBy === "hotness") {
        query = query.query((qb) => {
          qb.orderBy("entry.hotness", "desc");
        });
      } else if (options.sortBy === "rating-count") {
        query = query.query((qb) => {
          qb.orderBy("entry_details.rating_count");
        });
      } else if (options.sortBy === "rating") {
        query = query.query((qb) => {
          qb.leftJoin("event", "entry.event_id", "event.id")
            .where(function() {
              this.where("event.status", enums.EVENT.STATUS.CLOSED).orWhereNull("event.status");
            })
            .orderByRaw("entry_details.rating_1 "
              + ((config.DB_TYPE === "postgresql") ? "DESC NULLS LAST" : "IS NULL DESC"))
            .orderBy("entry.karma", "DESC");
        });
      } else if (options.sortBy === "ranking") {
        query = query.query((qb) => {
          qb.leftJoin("event", "entry.event_id", "event.id")
            .where(function() {
              this.where("event.status", enums.EVENT.STATUS.CLOSED).orWhereNull("event.status");
            })
            .orderByRaw("entry_details.ranking_1 " + ((config.DB_TYPE === "postgresql") ? "NULLS LAST" : "IS NOT NULL"))
            .orderBy("entry.created_at", "DESC")
            .orderBy("entry.division");
        });
      } else if (options.eventId !== null || options.sortBy === "karma") {
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
        qb.leftJoin("entry_platform", "entry_platform.entry_id", "entry.id")
          .whereIn("entry_platform.platform_id", options.platforms);
      });
    }
    if (options.tags) {
      query = query.query((qb) => {
        qb.leftJoin("entry_tag", "entry_tag.entry_id", "entry.id")
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
      });
    }
    if (options.highScoresSupport) {
      query = query.where("status_high_score", "!=", "off");
    }
    if (options.allowsTournamentUse) {
      query = query.where("entry_details.allow_tournament_use", true);
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
      return query.fetchAll(options) as Bluebird<BookshelfCollectionOf<EntryBookshelfModel>>;
    }
  }

  /**
   * Fetches the latest entries of any event
   * @param id {id} models.Entry ID
   * @returns {Entry}
   */
  public async findLatestEntries() {
    return models.Entry.query((qb) => {
      qb.whereNotNull("event_id");
    })
      .orderBy("created_at", "DESC")
      .fetchPage({
        pageSize: 4,
        withRelated: ["userRoles", "event"],
      });
  }

  /**
   * Fetches an models.Entry by its ID
   */
  public async findEntryById(id: number, options: FetchOptions = {}): Promise<EntryBookshelfModel> {
    return models.Entry.where("id", id).fetch({
      withRelated: ["details", "event", "userRoles", "tags"],
      ...options
    }) as Bluebird<EntryBookshelfModel>;
  }

  /**
   * Retrieves all the entries an user contributed to
   * @param  {User} user
   * @return {array(Entry)|null}
   */
  public async findUserEntries(user: User): Promise<BookshelfCollection> {
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
  public async findLatestUserEntry(user: User, options: FetchOptions = {}) {
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
      .fetch({
        withRelated: ["userRoles", "event"],
        ...options
      });
  }

  /**
   * Retrieves the entry a user submitted to an event
   */
  public async findUserEntryForEvent(user: User, eventId: number, options: FetchOptions = {}): Promise<EntryBookshelfModel> {
    return models.Entry.query((query) => {
      query.innerJoin("user_role", "entry.id", "user_role.node_id")
        .where({
          "entry.event_id": eventId,
          "user_role.user_id": user.get("id"),
          "user_role.node_type": "entry",
        });
    }).fetch({ withRelated: ["userRoles"], ...options }) as any;
  }

  public async findEntryInvitesForUser(
    user: User, options: FetchAllOptions & { notificationsLastRead?: boolean } = {}): Promise<BookshelfCollection> {

    let notificationsLastRead = new Date(0);
    if (options.notificationsLastRead && user.get("notifications_last_read") !== undefined) {
      notificationsLastRead = new Date(user.get("notifications_last_read"));
    }

    return models.EntryInvite
      .where("invited_user_id", user.get("id"))
      .where("created_at", ">", notificationsLastRead as any)
      .fetchAll(options) as Bluebird<BookshelfCollection>;
  }

  public async findRescueEntries(event: BookshelfModel, user: User, options: any = {}): Promise<BookshelfCollection> {
    const minRatings = await settings.findNumber(SETTING_EVENT_REQUIRED_ENTRY_VOTES, 10);

    if (options.pageSize === undefined) { options.pageSize = 4; }
    if (options.withRelated === undefined) { options.withRelated = ["details", "userRoles"]; }

    return models.Entry.where("entry.event_id", event.get("id"))
      .where("division", "<>", enums.DIVISION.UNRANKED)
      .query((qb) => {
        qb.leftJoin("entry_details", "entry_details.entry_id", "entry.id")
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

  public async countEntriesByEvent(event: BookshelfModel): Promise<number> {
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
  public async refreshEventReferences(event: BookshelfModel): Promise<void> {
    // TODO Transaction
    const entryCollection = await models.Entry.where("event_id", event.id).fetchAll() as BookshelfCollection;
    for (const entry of entryCollection.models) {
      entry.set("event_name", event.get("name"));
      await entry.save();
    }
  }

  public async refreshEntryPlatforms(entry) {
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

  /**
   * Updates the event counters on an event
   * @param  {Event} event
   * @return {void}
   */
  public async refreshEventCounts(event: BookshelfModel) {
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

      const details = event.related<BookshelfModel>("details");
      details.set("division_counts", divisionCounts);
      await details.save(null, { transacting: transaction });

      cache.eventsById.del(event.get("id"));
      cache.eventsByName.del(event.get("name"));
    });
  }

  public getEventFlag(event: BookshelfModel, flag: keyof EventFlags): boolean {
    const flags = event.related<BookshelfModel>("details").get("flags") as EventFlags;
    return flags[flag];
  }

}

export interface FindGamesOptions extends FetchPageOptions {
  count?: boolean;
  sortBy?: "rating-count" | "rating" | "ranking" | "hotness" | "karma";
  eventId?: number;
  search?: string;
  platforms?: string[];
  tags?: Array<{ id: number }>;
  divisions?: string[];
  notReviewedById?: string;
  userId?: number;
  user?: User;
  highScoresSupport?: boolean;
  allowsTournamentUse?: boolean;
}

export default new EventService();
