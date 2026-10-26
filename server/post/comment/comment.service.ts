import Bluebird from "bluebird";
import { BookshelfCollection, BookshelfModel, FetchPageOptions, NodeBookshelfModel } from "bookshelf";
import { ilikeOperator } from "server/core/config";
import constants from "server/core/constants";
import db from "server/core/db";
import * as models from "server/core/models";
import security, { ANONYMOUS_USER } from "server/core/security";
import { User } from "server/entity/user.entity";

export class CommentService {

  public async findCommentById(commentId: number): Promise<BookshelfModel> {
    return models.Comment.where("id", commentId)
      .fetch({ withRelated: ["user"] });
  }

  public async findLatestComments(options: FetchPageOptions): Promise<BookshelfModel[]> {
    const comments = await models.Comment.where({})
      .orderBy("created_at", "DESC")
      .fetchPage({
        withRelated: ["user", "node", "node.author"],
        ...options
      });

    return comments.filter((comment: BookshelfModel) => {
      const node = comment.related<BookshelfModel>("node");
      return security.canUserRead(ANONYMOUS_USER, node);
    });
  }

  /**
   * Fetches the comments of the given node, and sorts them by creation date.
   */
  public async findCommentsOnNodeForDisplay(node: NodeBookshelfModel): Promise<BookshelfModel[]> {
    await node.load(["comments", "comments.user"]);
    return node.related<BookshelfCollection>("comments").sortBy((comment) => comment.get("created_at"));
  }

  /**
   * Fetches all comments written by an user
   * @param  {User} user
   * @return {Collection(Comment)}
   */
  public async findCommentsByUser(user: User): Promise<BookshelfCollection> {
    return models.Comment.where("user_id", user.id)
      .orderBy("created_at", "DESC")
      .fetchAll({ withRelated: ["user", "node"] }) as Bluebird<BookshelfCollection>;
  }

  /**
   * Fetches all comments written by an user on an event's entries.
   * @param  {integer} userId
   * @param  {integer} eventId
   * @return {Collection(Comment)}
   */
  public async findCommentsByUserAndEvent(userId: number, eventId: number): Promise<BookshelfCollection> {
    return models.Comment.query((qb) => {
      void qb.innerJoin("entry", "comment.node_id", "entry.id")
        .where({
          "user_id": userId,
          "node_type": "entry",
          "entry.event_id": eventId,
        });
    })
      .fetchAll() as Bluebird<BookshelfCollection>;
  }

  /**
   * Fetches all comments interesting for an user.
   * This includes both "@"-mentions and all comments to the user posts & entries.
   * @param  {User} user
   * @param  {Object} options among "notificationsLastRead"
   * @return {Collection(Comment)}
   */
  public async findCommentsToUser(user: User, options: any = {}): Promise<BookshelfCollection> {
    // let's view any notifs in the last x mins

    let notificationsLastRead = new Date(0);
    if (options.notificationsLastRead && user.get("notifications_last_read") !== undefined) {
      notificationsLastRead = new Date(user.get("notifications_last_read"));
    }
    return models.Comment.query((qb) => {
      qb = qb.distinct()
        .leftJoin("user_role", function() {
          this.on("comment.node_id", "=", "user_role.node_id")
            .andOn("comment.node_type", "=", "user_role.node_type");
        })
        .where("user_role.user_id", user.id)
        .andWhere("comment.user_id", "<>", user.id)
        .andWhere("comment.updated_at", ">", notificationsLastRead)
        .andWhere("comment.updated_at", ">", db.knex.raw("user_role.created_at"))
        .orWhere("body", ilikeOperator(), "%@" + user.get("name") + "%");
    })
      .where("comment.updated_at", ">", notificationsLastRead as any)
      .orderBy("created_at", "DESC")
      .fetchAll({ withRelated: ["user", "node"] }) as Bluebird<BookshelfCollection>;
  }

  /**
   * Retrieves an array of anonmous comment IDs a user wrote on a node
   * @param  {User} user
   * @param  {number} nodeId
   * @param  {string} nodeType
   * @return {array(number)}
   */
  public async findOwnAnonymousCommentIds(user: User, nodeId: number, nodeType: string): Promise<number[]> {
    const results = await db.knex("anonymous_comment_user")
      .select("anonymous_comment_user.comment_id")
      .leftJoin("comment", "comment.id", "anonymous_comment_user.comment_id")
      .where({
        "anonymous_comment_user.user_id": user.get("id"),
        "comment.node_id": nodeId,
        "comment.node_type": nodeType,
      }) as any;
    return results.map((row) => row.comment_id);
  }

  /**
   * Checks whether an anonymous comment belongs to an user
   * @param  {Comment}  comment
   * @param  {User}  user
   * @return {boolean}
   */
  public async isOwnAnonymousComment(comment: BookshelfModel, user: User): Promise<boolean> {
    if (comment.get("user_id") === constants.ANONYMOUS_USER_ID) {
      const result = await db.knex("anonyous_comment_user")
        .count()
        .where({
          comment_id: comment.get("id"),
          user_id: user.get("id"),
        });
      return parseInt(result[0].count as string, 10) > 0;
    } else {
      return false;
    }
  }

  /**
   * Creates and persists a new comment.
   * @param  {User} user
   * @param  {Post|Entry} node
   * @param  {string} (optional) comment body
   * @param  {Boolean} requestAnonymous (optional)
   * @return {Comment}
   */
  public async createComment(user: User, node: NodeBookshelfModel, body: string, requestAnonymous = false): Promise<BookshelfModel> {
    const comment = await node.comments().create({
      user_id: user.get("id"),
      body,
    });

    if (requestAnonymous && !user.get("disallow_anonymous") && node.get("allow_anonymous")) {
      comment.set("user_id", -1);
      await comment.save(); // save the comment now to get an ID
      await db.knex("anonymous_comment_user").insert({
        comment_id: comment.get("id"),
        user_id: user.get("id"),
      });
    } else {
      await comment.save();
    }

    return comment;
  }

  /**
   * Deletes the given comment
   * @param  {Comment} comment
   * @return {void}
   */
  public async deleteComment(comment: BookshelfModel): Promise<void> {
    // In case it was an anonymous comment, delete the associated user link
    await db.knex("anonymous_comment_user")
      .where("comment_id", comment.get("id"))
      .del();

    await comment.destroy();
  }

}

export default new CommentService();
