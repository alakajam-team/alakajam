import { BookshelfCollection, BookshelfCollectionOf, BookshelfModel, PostBookshelfModel } from "bookshelf";
import constants from "server/core/constants";
import { createLuxonDate } from "server/core/formats";
import db from "server/core/db";
import * as models from "server/core/models";
import security, { SECURITY_PERMISSION_MANAGE } from "server/core/security";
import { User } from "server/entity/user.entity";
import userService from "server/user/user.service";

const FIRST_PICTURE_REGEXP = /(?:!\[.*?\]\((.*?)\)|src="([^"]+)")/;

export class PostService {

  /**
   * Finds the URL of the first picture in the body, if any.
   * Quick and not-completely-reliable implementation.
   * @param model Any model with a body
   */
  public getFirstPicture(model: BookshelfModel): string | false {
    const matches = FIRST_PICTURE_REGEXP.exec(model.get("body"));
    if (matches) {
      return matches[1] || matches[2]; // Markdown capture OR HTML tag capture
    }
    return false;
  }

  /**
   * Finds all posts from a feed (specified through options)
   */
  public findPosts(options: {
    specialPostType?: string;
    allowHidden?: boolean;
    allowDrafts?: boolean;
    eventId?: number | string;
    entryId?: number | string;
    userId?: number | string;
    page?: number;
    transacting?: any;
  } = {}): Promise<BookshelfCollectionOf<PostBookshelfModel>> {
    const query = models.Post.query((qb) => {
      if (options.specialPostType !== undefined) {
        qb = qb.where("special_post_type", options.specialPostType);
      }
      if (!options.allowHidden) {
        void qb.where((qb2) => {
          qb2 = qb2.where("special_post_type", "<>", "hidden");
          if (!options.specialPostType) {
            void qb2.orWhere("special_post_type", null);
          }
        });
      } else {
        void qb.orWhere("special_post_type", "hidden");
      }

      if (options.eventId) { qb = qb.where("post.event_id", options.eventId); }
      if (options.entryId) { qb = qb.where("post.entry_id", options.entryId); }
      if (options.userId) {
        qb = qb.innerJoin("user_role", "post.id", "user_role.node_id")
          .where("user_role.user_id", options.userId)
          .whereIn("permission", security.getPermissionsEqualOrAbove("write"));
      }

      if (!options.allowDrafts) { qb = qb.where("published_at", "<=", createLuxonDate().toJSDate()); }
    });

    query.orderBy("published_at", "DESC");

    return query.fetchPage({
      pageSize: 10,
      page: options.page,
      transacting: options.transacting,
      withRelated: ["author", "userRoles"],
    });
  }

  public findPostById(postId: number): Promise<PostBookshelfModel> {
    return models.Post.where("id", postId)
      .fetch({ withRelated: ["author", "userRoles", "event", "entry", "entry.userRoles"] }) as any;
  }

  /**
   * Finds a post by the ID it had before posts started sharing IDs with entries (see constants.POST_ID_FLOOR)
   */
  public findPostByLegacyId(legacyId: number): Promise<PostBookshelfModel> {
    return models.Post.where("legacy_id", legacyId).fetch() as any;
  }

  /**
   * Finds one post
   * @param  {object} options among "id name userId eventId specialPostType allowDrafts"
   * @return {Post}
   */
  public async findPost(options: {
    id?: string;
    name?: string;
    userId?: number;
    eventId?: number;
    specialPostType?: string;
    allowDrafts?: boolean;
  }): Promise<BookshelfModel> {
    let query = models.Post as BookshelfModel;
    if (options.id) { query = query.where("id", options.id); }
    if (options.name) { query = query.where("name", options.name); }
    if (options.eventId) { query = query.where("event_id", options.eventId); }
    if (options.userId) { query = query.where("author_user_id", options.userId); }
    if (options.specialPostType !== undefined) { query = query.where("special_post_type", options.specialPostType); }
    if (!options.allowDrafts) { query = query.where("published_at", "<=", createLuxonDate().toJSDate() as any); }
    return query
      .orderBy("published_at", "desc")
      .fetch({ withRelated: ["author", "userRoles"] });
  }

  /**
   * Finds the latest announcement
   * @param  {Object} options among "eventId"
   * @return {Post}
   */
  public async findLatestAnnouncement(options: { eventId?: number } = {}): Promise<BookshelfModel> {
    let query = models.Post
      .where("special_post_type", constants.SPECIAL_POST_TYPE_ANNOUNCEMENT)
      .where("published_at", "<=", createLuxonDate().toJSDate() as any);
    if (options.eventId) {
      query = query.where("event_id", options.eventId);
    }
    return query.orderBy("published_at", "DESC")
      .fetch({ withRelated: ["author", "userRoles"] });
  }

  /**
   * Creates and persists a new post, initializing the owner UserRole.
   * @param user
   * @param eventId the optional ID of an event to associate with.
   */
  public async createPost(user: User, eventId?: number): Promise<PostBookshelfModel> {
    return db.transaction(async (transacting) => {
      const post = new models.Post({
        author_user_id: user.get("id"),
        name: "",
        title: "",
      }) as PostBookshelfModel;
      await post.save(null, { transacting }); // otherwise the user role won't have a node_id

      await post.userRoles().create({
        user_id: user.get("id"),
        user_name: user.get("name"),
        user_title: user.get("title"),
        event_id: eventId,
        permission: SECURITY_PERMISSION_MANAGE,
      }, { transacting });
      return post;
    });
  }

  /**
   * Updates the comment count on the given node and saves it.
   * @param {Post|Entry} node
   */
  public async refreshCommentCount(node: BookshelfModel): Promise<void> {
    await node.load("comments");
    const comments = node.related<BookshelfCollection>("comments");
    await node.save({ comment_count: comments.length }, { patch: true });
  }

  /**
   * Deletes the given post, along with its comments, likes and user roles (cascaded by the DB)
   * @param {Post} post
   * @return {void}
   */
  public async deletePost(post: BookshelfModel): Promise<void> {
    await post.load(["userRoles", "comments.user"]);
    userService.invalidateUserCaches(
      ...post.related<BookshelfCollection>("userRoles").map((userRole) => userRole.get("user_name")),
      ...post.related<BookshelfCollection>("comments").map((comment) => comment.related<BookshelfModel>("user").get("name")));

    await post.destroy();
  }

  /**
   * Attach existing post on the event from a user the given entry
   * @param  {number} eventId
   * @param  {number} userId
   * @param  {number} entryId
   * @return {void}
   */
  public async attachPostsToEntry(
    eventId: number,
    userId: number,
    entryId: number,
    options: { transacting?: any } = {}): Promise<BookshelfModel[]> {
    // Attach posts from same event
    const posts = await this.findPosts({
      eventId,
      userId,
      specialPostType: null,
      transacting: options.transacting
    });

    const savePromises = posts.map(async (post) => {
      post.set("entry_id", entryId);
      return post.save(null, options);
    });
    return Promise.all(savePromises);
  }

}

export default new PostService();
