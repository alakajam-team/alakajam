import Bluebird from "bluebird";
import {
  BookshelfCollection,
  BookshelfCollectionOf,
  BookshelfModel,
  EntryBookshelfModel,
  FetchOptions,
  FetchPageOptions
} from "bookshelf";
import cache from "server/core/cache";
import config, { ilikeOperator } from "server/core/config";
import db from "server/core/db";
import enums from "server/core/enums";
import fileStorage from "server/core/file-storage";
import * as models from "server/core/models";
import { SECURITY_PERMISSION_MANAGE } from "server/core/security";
import settings from "server/core/settings";
import { SETTING_EVENT_REQUIRED_ENTRY_VOTES } from "server/core/settings-keys";
import { User } from "server/entity/user.entity";
import postService from "server/post/post.service";


/**
 * Service for managing events & entries.
 */
export class EntryService {

  /**
   * Creates and persists a new entry, initializing the owner UserRole.
   */
  public async createEntry(user: User, event?: BookshelfModel): Promise<EntryBookshelfModel> {
    const entry = new models.Entry({
      name: "untitled",
      title: "",
      comment_count: 0,
      pictures: {previews: []},
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

  public async deleteEntry(entry: EntryBookshelfModel): Promise<void> {
    // Unlink posts (not in transaction to prevent foreign key errors)
    const posts = await postService.findPosts({ entryId: entry.get("id") });
    for (const post of posts.models) {
      post.set("entry_id", null);
      await post.save();
    }

    await db.transaction(async (transaction) => {
      // Delete user roles & comments manually (because no cascading)
      await entry.load(["userRoles.user", "comments.user"], { transacting: transaction } as any);

      for (const userRole of entry.related<BookshelfCollection>("userRoles").models) {
        cache.user(userRole.related<any>("user")).del("latestEntry");
        await userRole.destroy({ transacting: transaction });
      }
      for (const comment of entry.related<BookshelfCollection>("comments").models) {
        cache.user(comment.related<any>("user")).del("byUserCollection");
        await comment.destroy({ transacting: transaction });
      }

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

  public async findEntries(options: FindGamesOptions = {}): Promise<BookshelfCollectionOf<EntryBookshelfModel> | number | string> {
    let query = new models.Entry()
      .query((qb) => {
        void qb.leftJoin("entry_details", "entry_details.entry_id", "entry.id");
      }) as BookshelfModel;

    // Sorting
    if (!options.count) {
      if (options.sortBy === "hotness") {
        query = query.query((qb) => {
          void qb.orderBy("entry.hotness", "desc");
        });
      } else if (options.sortBy === "rating-count") {
        query = query.query((qb) => {
          void qb.orderBy("entry_details.rating_count");
        });
      } else if (options.sortBy === "rating") {
        query = query.query((qb) => {
          void qb.leftJoin("event", "entry.event_id", "event.id")
            .where(function() {
              void this.where("event.status", enums.EVENT.STATUS.CLOSED).orWhereNull("event.status");
            })
            .orderByRaw("entry_details.rating_1 "
              + ((config.DB_TYPE === "postgresql") ? "DESC NULLS LAST" : "IS NULL DESC"))
            .orderBy("entry.karma", "DESC");
        });
      } else if (options.sortBy === "ranking") {
        query = query.query((qb) => {
          void qb.leftJoin("event", "entry.event_id", "event.id")
            .where(function() {
              void this.where("event.status", enums.EVENT.STATUS.CLOSED).orWhereNull("event.status");
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
        void qb.leftJoin("entry_platform", "entry_platform.entry_id", "entry.id")
          .whereIn("entry_platform.platform_id", options.platforms);
      });
    }
    if (options.tags) {
      query = query.query((qb) => {
        void qb.leftJoin("entry_tag", "entry_tag.entry_id", "entry.id")
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
          void qb.whereNot({
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
  public async findLatestEntries(): Promise<BookshelfCollection> {
    return models.Entry.query((qb) => {
      void qb.whereNotNull("event_id");
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
      void qb.distinct()
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
   */
  public async findLatestUserEntry(user: User, options: FetchOptions = {}): Promise<BookshelfModel> {
    return models.Entry.query((qb) => {
      void qb.distinct()
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
  public findUserEntryForEvent(user: User, eventId: number, options: FetchOptions = {}): Promise<EntryBookshelfModel> {
    return models.Entry.query((query) => {
      void query.innerJoin("user_role", "entry.id", "user_role.node_id")
        .where({
          "entry.event_id": eventId,
          "user_role.user_id": user.get("id"),
          "user_role.node_type": "entry",
        });
    }).fetch({ withRelated: ["userRoles"], ...options }) as any;
  }

  public async findRescueEntries(event: BookshelfModel, user: User, options: any = {}): Promise<BookshelfCollection> {
    const minRatings = await settings.findNumber(SETTING_EVENT_REQUIRED_ENTRY_VOTES, 10);

    if (options.pageSize === undefined) { options.pageSize = 3; }
    if (options.withRelated === undefined) { options.withRelated = ["details", "userRoles"]; }

    return models.Entry.where("entry.event_id", event.get("id"))
      .where("division", "<>", enums.DIVISION.UNRANKED)
      .query((qb) => {
        void qb.leftJoin("entry_details", "entry_details.entry_id", "entry.id")
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

  public async refreshEntryPlatforms(entry: BookshelfModel): Promise<void> {
    const tasks = [];
    await entry.load("platforms");
    entry.related<BookshelfCollection>("platforms").forEach((platform) => {
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

}

export interface FindGamesOptions extends FetchPageOptions {
  count?: boolean;
  sortBy?: "rating-count" | "rating" | "ranking" | "hotness" | "karma";
  eventId?: number;
  search?: string;
  platforms?: number[];
  tags?: Array<{ id: number; value: string }>;
  divisions?: string[];
  notReviewedById?: string;
  userId?: number;
  user?: User;
  highScoresSupport?: boolean;
  allowsTournamentUse?: boolean;
}

export default new EntryService();
