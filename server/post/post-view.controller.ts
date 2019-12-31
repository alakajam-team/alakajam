import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import security from "server/core/security";
import templating from "server/core/templating-functions";
import { CustomRequest, CustomResponse } from "server/types";
import eventService from "../event/event.service";
import commentService from "./comment/comment.service";
import likeService from "./like/like.service";
import postService from "./post.service";

/**
 * View a blog post
 */
export async function postView(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  // Check permissions
  const { post, user } = res.locals;
  if (postService.isPast(post.get("published_at")) ||
      security.canUserRead(user, post, { allowMods: true })) {
    // Fetch comments and likes
    const context = await buildPostContext(post, user);

    // Guess social thumbnail pic
    res.locals.pageImage = postService.getFirstPicture(post);
    if (res.locals.pageImage && res.locals.pageImage.indexOf("://") === -1) {
      res.locals.pageImage = templating.staticUrl(res.locals.pageImage);
    }

    res.render("post/post-view", context);
  } else {
    res.errorPage(403);
  }
}

/**
 * Fetch related event, entry, comments & current user likes
 */
export async function buildPostContext(post: BookshelfModel, currentUser: BookshelfModel) {
  const context = {
    post,
    allEvents: (await eventService.findEvents()).models,
    relatedEvent: undefined,
    relatedEntry: undefined,
    specialPostType: undefined,
    sortedComments: undefined,
    userLikes: undefined
  };

  if (post.get("event_id")) {
    context.relatedEvent = await eventService.findEventById(post.get("event_id"));
  }
  const relatedEntry = post.related("entry") as BookshelfModel;
  if (relatedEntry.id && !post.get("special_post_type")) {
    context.relatedEntry = relatedEntry;
  }
  context.specialPostType = post.get("special_post_type");

  if (post.id) {
    context.sortedComments = await commentService.findCommentsSortedForDisplay(post);
    if (currentUser) {
      context.userLikes = await likeService.findUserLikeInfo([post], currentUser);
    }
  }
  return context;
}
