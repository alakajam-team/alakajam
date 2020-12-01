
import cache from "server/core/cache";
import constants from "server/core/constants";
import db from "server/core/db";
import forms from "server/core/forms";
import links from "server/core/links";
import security from "server/core/security";
import entryService from "server/entry/entry.service";
import eventRatingService from "server/event/rating/event-rating.service";
import karmaService from "server/event/rating/karma.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import { PostLocals } from "../post.middleware";
import commentService from "./comment.service";

/**
 * Save or delete a comment
 */
export async function commentSave(req: CustomRequest, res: CustomResponse<PostLocals>) {
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
export async function handleSaveComment(reqBody, currentUser, currentNode, baseUrl, currentEvent?) {
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
  let nodeType = null;
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
        nodeType = comment.get("node_type");
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
    nodeType = nodeType || comment.get("node_type");
    userId = userId || comment.get("user_id");

    // Entry-specific updates
    if (nodeType === "entry") {
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
        const currentEntry = currentNode;
        const userEntry = await entryService.findUserEntryForEvent(currentUser, currentEntry.get("event_id"));
        await eventRatingService.refreshEntryKarma(currentEntry, currentEvent);
        if (userEntry) {
          await eventRatingService.refreshEntryKarma(userEntry, currentEvent);
        }
      }
    }

    // Cache invalidation: comment feed and unread notifications of users associated with the post/entry
    const userRoles = currentNode.related("userRoles");
    userRoles.forEach((userRole) => {
      const userCache = cache.user(userRole.get("user_name"));
      userCache.del("toUserCollection");
      userCache.del("unreadNotifications");
    });

    // Cache invalidation: Users @mentioned in the comment
    if (typeof commentBody === "string") {
      commentBody.split(" ").forEach((word) => {
        if (word.length > 0 && word.startsWith("@")) {
          const userCache = cache.user(word.slice(1));
          userCache.del("toUserCollection");
          userCache.del("unreadNotifications");
        }
      });
    }

    // Cache invalidation: User's own comment history
    cache.user(currentUser.get("name")).del("byUserCollection");

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
