import { BookshelfCollection } from "bookshelf";
import db from "server/core/db";
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
    await res.redirectToLogin();
    return;
  }

  res.locals.pageTitle += " | Join";

  const entry = await eventService.findUserEntryForEvent(user, event.get("id"));

  let postsCollection: BookshelfCollection = new db.Collection() as BookshelfCollection;
  if (entry) {
    await entry.load("posts");
    postsCollection = entry.related<BookshelfCollection>("posts");
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
    posts: postsCollection.models
  });
}
