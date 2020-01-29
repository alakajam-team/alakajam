import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";

/**
 * Browse event announcements
 */
export async function viewEventAnnouncements(req, res) {
  res.locals.pageTitle += " | Announcements";

  const posts = await postService.findPosts({
    eventId: res.locals.event.get("id"),
    specialPostType: "announcement",
  });

  res.render("event/event-announcements", {
    posts,
    userLikes: await likeService.findUserLikeInfo(posts.models, res.locals.user),
  });
}
