import eventService from "server/event/event.service";
import postService from "server/post/post.service";

/**
 * Manage user posts
 */
export async function dashboardPosts(req, res) {
  let newPostEvent = await eventService.findEventByStatus("open");
  if (!newPostEvent) {
    newPostEvent = await eventService.findEventByStatus("pending");
  }
  const allPostsCollection = await postService.findPosts({
    userId: res.locals.dashboardUser.get("id"),
    allowDrafts: true,
  });
  const draftPosts = allPostsCollection.where({ published_at: null });

  res.render("user/dashboard/dashboard-posts", {
    publishedPosts: allPostsCollection.difference(draftPosts),
    draftPosts,
    newPostEvent,
  });
}
