import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import * as eventMacros from "server/event/event.macros";
import { ifSet, ifTrue } from "server/macros/jsx-utils";
import * as navigationMacros from "server/macros/navigation.macros";
import * as postMacros from "server/post/post.macros";

export default function render(context: CommonLocals): JSX.Element {
  const { posts, pageCount, userLikes, user, userPost, event } = context;

  return base(context,
    <div class="container thin">
      {ifSet(user, () =>
        <div class="container thin">
          {eventMacros.eventShortcutMyPost(user as any, event, userPost)}
        </div>
      )}

      {posts.map(post =>
        postMacros.post(post, { readingUser: user, readingUserLikes: userLikes })
      )}

      {ifTrue(posts.length > 0, () =>
        navigationMacros.pagination(1, pageCount, "/posts?event_id=" + event.get("id"))
      )}
      {ifTrue(posts.length === 0, () =>
        <div class="card card-body">
          No posts yet.
        </div>
      )}
    </div>
  );
}
