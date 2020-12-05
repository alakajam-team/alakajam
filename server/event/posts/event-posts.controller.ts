import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomResponse } from "server/types";
import { EventLocals } from "../event.middleware";

/**
 * Browse event posts
 */
export async function viewEventPosts(_, res: CustomResponse<EventLocals>): Promise<void> {
  res.locals.pageTitle += " | Posts";

  const postsCollection = await postService.findPosts({
    eventId: res.locals.event.get("id"),
  });
  await postsCollection.load(["entry", "event"]);

  res.render<EventLocals>("event/posts/event-posts", {
    ...res.locals,
    posts: postsCollection.models,
    pageCount: postsCollection.pagination.pageCount,
    userLikes: await likeService.findUserLikeInfo(postsCollection.models, res.locals.user),
  });
}
