import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "./event.middleware";
import eventService from "./event.service";

/**
 * Browse event home page
 */
export async function viewEventHome(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { user, event } = res.locals;

  const posts = await postService.findPosts({
    eventId: event.get("id"),
    specialPostType: "announcement",
  });
  const userEntry = user ? await eventService.findUserEntryForEvent(user, event.get("id")) : undefined;

  res.render("event/event-home", {
    posts,
    userEntry,
    userLikes: await likeService.findUserLikeInfo(posts.models, res.locals.user),
  });
}
