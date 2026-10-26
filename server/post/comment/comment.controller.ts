
import { BookshelfCollection, BookshelfModel, EntryBookshelfModel, NodeBookshelfModel } from "bookshelf";
import constants from "server/core/constants";
import db from "server/core/db";
import forms from "server/core/forms";
import links from "server/core/links";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import entryService from "server/entry/entry.service";
import karmaService from "server/event/ratings/karma.service";
import ratingService from "server/event/ratings/rating.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";
import { PostLocals } from "../post.middleware";
import commentService from "./comment.service";

/**
 * Save or delete a comment
 */
export async function commentSave(req: CustomRequest, res: CustomResponse<PostLocals>): Promise<void> {
  const redirectUrl = await handleSaveComment(req.body, res.locals.user, res.locals.post,
    links.routeUrl(res.locals.post, "post"));
  res.redirect(redirectUrl);
}

/**
 * Handler for handling the comment saving form.
 * Reusable between all controllers of models supporting comments.
 * @param {object} reqBody The parsed request body
 * @param {User} user The current user
 * @param {Post|Entry} node The current node model
 * @param {string} baseUrl The view URL for the current node
 * @param {Event} currentEvent The current event, if the node is an entry
 * @return {string} A URL to redirect to
 */
export async function handleSaveComment(reqBody: Record<string, any>, currentUser: User, currentNode: NodeBookshelfModel,
                                        baseUrl: string, currentEvent?: BookshelfModel): Promise<string> {
  let redirectUrl = baseUrl;

  // Validate comment body
  const commentBody = forms.sanitizeMarkdown(reqBody.body, { maxLength: constants.MAX_BODY_COMMENT });
  if (!currentUser || !commentBody) {
    return redirectUrl;
  }

  // Check permissions, then update/create/delete comment
  let comment = null;
  let isCreation = false;
  const isDeletion = reqBody.delete;
  let hasWritePermissions = false;
  let userId = null;
  if (reqBody.id) {
    if (forms.isId(reqBody.id)) {
      comment = await commentService.findCommentById(reqBody.id);
      hasWritePermissions = security.canUserManage(currentUser, comment, { allowMods: true }) ||
          (comment && await commentService.isOwnAnonymousComment(comment, currentUser));
    }

    if (hasWritePermissions) {
      if (isDeletion) {
        // Delete comment
        userId = comment.get("user_id");
        await commentService.deleteComment(comment);
      } else {
        // Update comment
        comment.set("body", commentBody);
        await comment.save();
      }
    } else {
      return redirectUrl;
    }
  } else {
    isCreation = true;
    hasWritePermissions = true;
    comment = await commentService.createComment(currentUser, currentNode, commentBody, reqBody["comment-anonymously"]);
  }

  // Comment repercussions
  if (hasWritePermissions) {
    userId = userId || comment.get("user_id");

    // Entry-specific updates
    if (currentNode.nodeType() === "entry") {
      if (isCreation) {
        if (!currentUser.get("disallow_anonymous") && reqBody["comment-anonymously"]
            && currentNode.get("allow_anonymous")) {
          comment.set("user_id", -1);
          await db.knex("anonymous_comment_user").insert({
            comment_id: comment.get("id"),
            user_id: userId,
          });
        }
        await karmaService.refreshCommentKarma(comment);
        await comment.save();
      } else {
        // This change might impact the karma of other comments, refresh them
        await karmaService.refreshUserCommentKarmaOnNode(currentNode, userId);
      }

      // Refresh karma on both the giver & receiver entries
      if (currentEvent) {
        const currentEntry = currentNode as EntryBookshelfModel;
        const userEntry = await entryService.findUserEntryForEvent(currentUser, currentEntry.get("event_id"));
        await ratingService.refreshEntryKarma(currentEntry, currentEvent);
        if (userEntry) {
          await ratingService.refreshEntryKarma(userEntry, currentEvent);
        }
      }
    }

    // Cache invalidation: users associated with the post/entry, @mentioned in the comment, and the author
    const mentionedUserNames = (typeof commentBody === "string" ? commentBody.split(" ") : [])
      .filter((word) => word.length > 1 && word.startsWith("@"))
      .map((word) => word.slice(1));
    userService.invalidateUserCaches(
      ...currentNode.related<BookshelfCollection>("userRoles").map((userRole) => userRole.get("user_name")),
      ...mentionedUserNames,
      currentUser.get("name"));

    // Refresh node comment count
    if (isDeletion || isCreation) {
      await postService.refreshCommentCount(currentNode);
    }

    // Redirect to anchor
    if (!isDeletion) {
      redirectUrl += links.routeUrl(comment, "comment");
    }
  }

  return redirectUrl;
}
