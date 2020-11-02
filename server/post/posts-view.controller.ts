import { CommonLocals } from "server/common.middleware";
import constants from "server/core/constants";
import forms from "server/core/forms";
import { CustomRequest, CustomResponse } from "server/types";
import likeService from "./like/like.service";
import postService from "./post.service";

/**
 * General paginated posts browsing
 */
export async function postsView(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  // Fetch posts
  let specialPostType = forms.sanitizeString(req.query.special_post_type?.toString()) || null;
  if (specialPostType === "all") {
    specialPostType = undefined;
  }
  const eventId = forms.sanitizeString(req.query.event_id?.toString()) || undefined;
  const userId = forms.sanitizeString(req.query.user_id?.toString()) || undefined;
  const currentPage = forms.isId(req.query.p) ? forms.parseInt(req.query.p.toString()) : 1;
  const postsCollection = await postService.findPosts({
    specialPostType,
    eventId,
    userId,
    page: currentPage,
  });
  await postsCollection.load(["event", "entry"]);
  const posts = postsCollection.models;

  // Determine title
  let title = "Posts";
  if (specialPostType === constants.SPECIAL_POST_TYPE_ANNOUNCEMENT) {
    title = "Announcements";
  }
  res.locals.pageTitle = title;

  // Determine base URL for pagination
  let paginationBaseUrl = "/posts?";
  if (specialPostType !== null) {
    paginationBaseUrl += "&special_post_type=" + req.query.special_post_type;
  }
  if (eventId) {
    paginationBaseUrl += "&event_id=" + eventId;
  }
  if (userId) {
    paginationBaseUrl += "&user_id=" + userId;
  }

  res.render<CommonLocals>("post/posts-view", {
    ...res.locals,
    posts,
    userLikes: await likeService.findUserLikeInfo(posts, res.locals.user),
    title,
    currentPage,
    pageCount: postsCollection.pagination.pageCount,
    paginationBaseUrl,
  });
}
