import forms from "server/core/forms";
import eventService from "server/event/event.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import { DashboardLocals } from "./dashboard.middleware";

/**
 * Manage user posts
 */
export async function dashboardPosts(req: CustomRequest, res: CustomResponse<DashboardLocals>) {
  let currentPage = 1;
  if (forms.isId(req.query.p)) {
    currentPage = forms.parseInt(req.query.p.toString());
  }

  let newPostEvent = await eventService.findEventByStatus("open");
  if (!newPostEvent) {
    newPostEvent = await eventService.findEventByStatus("pending");
  }
  const allPostsCollection = await postService.findPosts({
    userId: res.locals.dashboardUser.id,
    allowDrafts: true,
    page: currentPage
  });
  const draftPosts = allPostsCollection.filter((post) => !post.get("published_at"));

  res.render<DashboardLocals>("user/dashboard/dashboard-posts", {
    ...res.locals,
    publishedPosts: allPostsCollection.filter((post) => !draftPosts.includes(post)),
    draftPosts,
    newPostEvent,
    currentPage,
    pageCount: allPostsCollection.pagination.pageCount
  });
}
