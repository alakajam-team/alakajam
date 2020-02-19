import { BookshelfCollectionOf, PostBookshelfModel } from "bookshelf";
import db from "server/core/db";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "./event.middleware";
import eventService from "./event.service";

/**
 * Manage my entry to an event
 */
export async function viewEventMyEntry(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { user, event } = res.locals;

  if (!user) {
    res.redirectToLogin();
    return;
  }

  res.locals.pageTitle += " | Join";

  const entry = await eventService.findUserEntryForEvent(user, event.get("id"), {
    withRelated: [ "posts.likes", "posts.userRoles" ]
  });

  let postsCollection: BookshelfCollectionOf<PostBookshelfModel>
    = new db.Collection() as BookshelfCollectionOf<PostBookshelfModel>;
  if (entry) {
    postsCollection = entry.related("posts");
  } else {
    postsCollection = await postService.findPosts({
      userId: user.get("id"),
      eventId: event.get("id"),
      specialPostType: null
    });
  }

  const latestPost = postsCollection.find((post) => {
    return post.get("author_user_id") === user.get("id");
  });

  res.render("event/event-my-entry", {
    entry,
    latestPost,
    posts: postsCollection.models,
    userLikes: await likeService.findUserLikeInfo(postsCollection.models, user),
  });
}
