import constants from "server/core/constants";
import forms from "server/core/forms";
import likeService from "./like/like.service";
import postService from "./post.service";

/**
 * General paginated posts browsing
 */
export async function postsView(req, res) {
  // Fetch posts
  let specialPostType = forms.sanitizeString(req.query.special_post_type) || null;
  if (specialPostType === "all") {
    specialPostType = undefined;
  }
  const eventId = forms.sanitizeString(req.query.event_id) || undefined;
  const userId = forms.sanitizeString(req.query.user_id) || undefined;
  const currentPage = forms.isId(req.query.p) ? parseInt(req.query.p, 10) : 1;
  const posts = await postService.findPosts({
    specialPostType,
    eventId,
    userId,
    page: currentPage,
  });
  await posts.load(["event", "entry"]);

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

  res.render("posts", {
    posts: posts.models,
    userLikes: await likeService.findUserLikeInfo(posts, res.locals.user),
    title,
    currentPage,
    pageCount: posts.pagination.pageCount,
    paginationBaseUrl,
  });
}
