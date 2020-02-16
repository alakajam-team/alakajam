import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "./event.middleware";

/**
 * Browse event home page
 */
export async function viewEventHome(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const posts = await postService.findPosts({
    eventId: res.locals.event.get("id"),
    specialPostType: "announcement",
  });

  res.render("event/event-home", {
    posts,
    userLikes: await likeService.findUserLikeInfo(posts.models, res.locals.user),
  });
}
