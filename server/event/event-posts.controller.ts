import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";

/**
 * Browse event posts
 */
export async function viewEventPosts(_, res) {
  res.locals.pageTitle += " | Posts";

  const postsCollection = await postService.findPosts({
    eventId: res.locals.event.get("id"),
  });
  await postsCollection.load(["entry", "event"]);

  res.render("event/event-posts", {
    posts: postsCollection.models,
    pageCount: postsCollection.pagination.pageCount,
    userLikes: await likeService.findUserLikeInfo(postsCollection.models, res.locals.user),
  });
}
