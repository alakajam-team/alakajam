import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import { ifTrue } from "server/macros/jsx-utils";
import * as navigationMacros from "server/macros/navigation.macros";
import * as postMacros from "server/post/post.macros";

export default function render(context: CommonLocals) {
  const { title, currentPage, pageCount, paginationBaseUrl, user, userLikes, posts } = context;

  return base(context,

    <div class="container thin">
      <h2>{title}</h2>

      {navigationMacros.pagination(currentPage, pageCount, paginationBaseUrl)}

      {posts.map(post =>
        postMacros.post(post, { readingUser: user, readingUserLikes: userLikes })
      )}
      {ifTrue(posts.length === 0, () =>
        <div class="card card-body">
          No posts yet.
        </div>
      )}

      {navigationMacros.pagination(currentPage, pageCount, paginationBaseUrl)}
    </div>
  );
}
