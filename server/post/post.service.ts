import cache from "server/core/cache";
import constants from "server/core/constants";
import * as models from "server/core/models";
import security from "server/core/security";

const FIRST_PICTURE_REGEXP = /(?:!\[.*?\]\((.*?)\)|src="([^"]+)")/;

export default {
  isPast,
  getFirstPicture,

  findPosts,
  findPostById,
  findPost,
  findLatestAnnouncement,

  createPost,
  refreshCommentCount,
  deletePost,

  attachPostsToEntry,
};

/**
 * Indicates if a date is already past
 * @param  {number}  time
 * @return {Boolean}
 */
function isPast(time) {
  return time && (new Date().getTime() - time) > 0;
}

/**
 * Finds the URL of the first picture in the body, if any.
 * Quick and not-completely-reliable implementation.
 * @param {Model} model Any model with a body
 */
function getFirstPicture(model) {
  const matches = FIRST_PICTURE_REGEXP.exec(model.get("body"));
  if (matches) {
    return matches[1] || matches[2]; // Markdown capture OR HTML tag capture
  }
  return null;
}

/**
 * Finds all posts from a feed (specified through options)
 * @param  {object} options among "specialPostType allowHidden allowDrafts eventId entryId userId"
 * @return {array(Post)}
 */
async function findPosts(options: {
      specialPostType?: string,
      allowHidden?: boolean,
      allowDrafts?: boolean,
      eventId?: number|string,
      entryId?: number|string,
      userId?: number|string,
      page?: number,
      transacting?: any
    } = {}) {
  let postCollection = await models.Post;
  postCollection = postCollection.query((qb) => {
    if (options.specialPostType !== undefined) {
      qb = qb.where("special_post_type", options.specialPostType);
    }
    if (!options.allowHidden) {
      qb.where((qb2) => {
        qb2 = qb2.where("special_post_type", "<>", "hidden");
        if (!options.specialPostType) {
          qb2.orWhere("special_post_type", null);
        }
      });
    } else {
      qb.orWhere("special_post_type", "hidden");
    }

    if (options.eventId) { qb = qb.where("post.event_id", options.eventId); }
    if (options.entryId) { qb = qb.where("post.entry_id", options.entryId); }
    if (options.userId) {
      qb = qb.innerJoin("user_role", "post.id", "user_role.node_id")
        .where({
          "user_role.user_id": options.userId,
          "user_role.node_type": "post",
        })
        .whereIn("permission", security.getPermissionsEqualOrAbove(constants.PERMISSION_WRITE));
    }

    if (!options.allowDrafts) { qb = qb.where("published_at", "<=", new Date()); }
    return qb;
  });
  postCollection.orderBy("published_at", "DESC");

  return postCollection.fetchPage({
    pageSize: 10,
    page: options.page,
    transacting: options.transacting,
    withRelated: ["author", "userRoles"],
  });
}

async function findPostById(postId) {
  return models.Post.where("id", postId)
    .fetch({ withRelated: ["author", "userRoles", "event", "entry", "entry.userRoles"] });
}

/**
 * Finds one post
 * @param  {object} options among "id name userId eventId specialPostType allowDrafts"
 * @return {Post}
 */
async function findPost(options: any = {}) {
  let query = models.Post;
  if (options.id) { query = query.where("id", options.id); }
  if (options.name) { query = query.where("name", options.name); }
  if (options.eventId) { query = query.where("event_id", options.eventId); }
  if (options.userId) { query = query.where("author_user_id", options.userId); }
  if (options.specialPostType !== undefined) { query = query.where("special_post_type", options.specialPostType); }
  if (!options.allowDrafts) { query = query.where("published_at", "<=", new Date()); }
  return query
    .orderBy("published_at", "desc")
    .fetch({ withRelated: ["author", "userRoles"] });
}

/**
 * Finds the latest announcement
 * @param  {Object} options among "eventId"
 * @return {Post}
 */
async function findLatestAnnouncement(options: any = {}) {
  let query = models.Post
    .where("special_post_type", constants.SPECIAL_POST_TYPE_ANNOUNCEMENT)
    .where("published_at", "<=", new Date());
  if (options.eventId) {
    query = query.where("event_id", options.eventId);
  }
  return query.orderBy("published_at", "DESC")
    .fetch({ withRelated: ["author", "userRoles"] });
}

/**
 * Creates and persists a new post, initializing the owner UserRole.
 * @param  {User} user
 * @param  {number} eventId the optional ID of an event to associate with.
 * @return {Post}
 */
async function createPost(user, eventId = null) {
  const post = new models.Post({
    author_user_id: user.get("id"),
    name: "",
    title: "",
  });
  await post.save(); // otherwise the user role won't have a node_id

  await post.userRoles().create({
    user_id: user.get("id"),
    user_name: user.get("name"),
    user_title: user.get("title"),
    event_id: eventId,
    permission: constants.PERMISSION_MANAGE,
  });
  return post;
}

/**
 * Updates the comment count on the given node and saves it.
 * @param {Post|Entry} node
 */
async function refreshCommentCount(node) {
  await node.load("comments");
  const commentCount = node.related("comments").size();
  await node.save({ comment_count: commentCount }, { patch: true });
}

/**
 * Deletes the given post
 * @param {Post} post
 * @return {void}
 */
async function deletePost(post) {
  await post.load(["userRoles.user", "comments.user"]);
  post.related("userRoles").each((userRole) => {
    cache.user(userRole.related("user")).del("latestPostsCollection");
    userRole.destroy();
  });
  post.related("comments").each((comment) => {
    cache.user(comment.related("user")).del("byUserCollection");
    comment.destroy();
  });

  await post.destroy();
}

/**
 * Attach existing post on the event from a user the given entry
 * @param  {number} eventId
 * @param  {number} userId
 * @param  {number} entryId
 * @return {void}
 */
async function attachPostsToEntry(eventId, userId, entryId, options: { transacting?: any } = {}) {
  // Attach posts from same event
  const posts = await findPosts({
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
