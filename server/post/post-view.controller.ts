import { BookshelfCollection, BookshelfModel, PostBookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import security from "server/core/security";
import templating from "server/core/templating-functions";
import { User } from "server/entity/user.entity";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";
import eventService from "../event/event.service";
import commentService from "./comment/comment.service";
import likeService from "./like/like.service";
import { PostLocals } from "./post.middleware";
import postService from "./post.service";

/**
 * View a blog post
 */
export async function postView(req: CustomRequest, res: CustomResponse<PostLocals>): Promise<void> {
  // Check permissions
  const { post, user } = res.locals;
  if (postService.isPast(post.get("published_at")) ||
      security.canUserRead(user, post, { allowMods: true })) {
    // Fetch comments and likes
    const context = await buildPostContext(res.locals);

    // Guess social thumbnail pic
    res.locals.pageImage = postService.getFirstPicture(post) || undefined;
    if (res.locals.pageImage && res.locals.pageImage.indexOf("://") === -1) {
      res.locals.pageImage = templating.staticUrl(res.locals.pageImage);
    }

    res.render<CommonLocals>("post/post-view", context);
  } else {
    res.errorPage(403);
  }
}

/**
 * Fetch related event, entry, comments & current user likes
 */
export async function buildPostContext(locals: PostLocals): Promise<PostLocals> {
  const post: PostBookshelfModel = locals.post;
  const currentUser: User | undefined = locals.user;

  const context = {
    ...locals,
    allEvents: (await eventService.findEvents()).models,
    isTrusterUser: currentUser ? (await userService.isTrustedUser(locals.user)) : false,
    relatedEvent: undefined,
    relatedEntry: undefined,
    specialPostType: undefined,
    sortedComments: undefined,
    userLikes: undefined,
    nodeAuthorIds: undefined
  };

  if (post.get("event_id")) {
    context.relatedEvent = await eventService.findEventById(post.get("event_id"));
  }
  const relatedEntry = post.related<BookshelfModel>("entry");
  if (relatedEntry.id && !post.get("special_post_type")) {
    context.relatedEntry = relatedEntry;
  }
  context.specialPostType = post.get("special_post_type");

  if (post.id) {
    const [ sortedComments, userLikes ] = await Promise.all([
      await commentService.findCommentsOnNodeForDisplay(post),
      currentUser ? await likeService.findUserLikeInfo([post], currentUser) : [],
      post.load("userRoles")
    ]);

    context.sortedComments = sortedComments;
    context.userLikes = userLikes;
    context.nodeAuthorIds = post.related<BookshelfCollection>("userRoles").map(userRole => userRole.get("user_id"));
  }
  return context;
}
