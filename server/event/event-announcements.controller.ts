import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "./event.middleware";

/**
 * Browse event announcements
 */
export async function viewEventAnnouncements(req: CustomRequest, res: CustomResponse<EventLocals>) {
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
