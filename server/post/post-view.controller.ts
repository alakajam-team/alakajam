import security from "server/core/security";
import templating from "server/core/templating-functions";
import eventService from "../event/event.service";
import commentService from "./comment/comment.service";
import likeService from "./like/like.service";
import postService from "./post.service";

/**
 * View a blog post
 */
export async function postView(req, res) {
  // Check permissions
  const post = res.locals.post;
  if (postService.isPast(res.locals.post.get("published_at")) ||
      security.canUserRead(res.locals.user, post, { allowMods: true })) {
    // Fetch comments and likes
    const context: any = await buildPostContext(post);
    context.sortedComments = await commentService.findCommentsSortedForDisplay(post);
    if (res.locals.user) {
      context.userLikes = await likeService.findUserLikeInfo([post], res.locals.user);
    }

    // Guess social thumbnail pic
    context.pageImage = postService.getFirstPicture(post);
    if (context.pageImage && context.pageImage.indexOf("://") === -1) {
      context.pageImage = templating.staticUrl(context.pageImage);
    }

    res.render("post/post", context);
  } else {
    res.errorPage(403);
  }
}

export async function buildPostContext(post) {
  // Fetch related event & entry info
  const context: any = {
    post,
    allEvents: (await eventService.findEvents()).models,
  };
  if (post.get("event_id")) {
    context.relatedEvent = await eventService.findEventById(post.get("event_id"));
  }
  if (post.related("entry").id && !post.get("special_post_type")) {
    context.relatedEntry = post.related("entry");
  }
  context.specialPostType = post.get("special_post_type");
  return context;
}
