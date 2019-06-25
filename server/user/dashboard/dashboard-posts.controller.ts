import forms from "server/core/forms";
import eventService from "server/event/event.service";
import postService from "server/post/post.service";

/**
 * Manage user posts
 */
export async function dashboardPosts(req, res) {
  let currentPage = 1;
  if (forms.isId(req.query.p)) {
    currentPage = parseInt(req.query.p, 10);
  }

  let newPostEvent = await eventService.findEventByStatus("open");
  if (!newPostEvent) {
    newPostEvent = await eventService.findEventByStatus("pending");
  }
  const allPostsCollection = await postService.findPosts({
    userId: res.locals.dashboardUser.get("id"),
    allowDrafts: true,
    page: currentPage
  });
  const draftPosts = allPostsCollection.where({ published_at: null });

  res.render("user/dashboard/dashboard-posts", {
    publishedPosts: allPostsCollection.difference(draftPosts),
    draftPosts,
    newPostEvent,
    currentPage,
    pageCount: allPostsCollection.pagination.pageCount
  });
}
