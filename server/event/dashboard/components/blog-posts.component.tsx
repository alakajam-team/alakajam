import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import { User } from "server/entity/user.entity";
import * as eventMacros from "server/event/event.macros";
import { ifSet, ifTrue } from "server/macros/jsx-utils";
import * as postMacros from "server/post/post.macros";

export function eventDashboardBlogPosts(user: User, event: BookshelfModel, entry: BookshelfModel,
  posts: BookshelfModel[], latestPost: BookshelfModel, userLikes: Record<number, string>) {
  return <>
    <p class="mt-3">{eventMacros.eventShortcutMyPost(user as any, event, latestPost, { buttonsOnly: true })}</p>

    {ifTrue(posts.length === 0, () =>
      <div class="card card-body">
        <h4>You don't have posts on this event yet.</h4>
        {ifTrue(event.get("status_entry") === "off", () =>
          <p>Make a blog post to present yourself and share your plans for the event!</p>
        )}
        {ifSet(entry, () =>
          <p>Telling your experience with a post is a good way to share what you learnt and exchange impressions!</p>
        )}
      </div>
    )}

    <div class="mt-4">
      {posts.map(post => {
        postMacros.post(post, { hideBody: true, smallTitle: true, readingUser: user, readingUserLikes: userLikes }); }
      )}
    </div>
  </>;
}
