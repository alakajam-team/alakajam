import React, { JSX } from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import { ifTrue } from "server/macros/jsx-utils";
import * as navigationMacros from "server/macros/navigation.macros";
import * as postMacros from "server/post/post.macros";
import dashboardBase from "../dashboard.base.template";

export default function render(context: CommonLocals): JSX.Element {
  const { draftPosts, publishedPosts, newPostEvent, currentPage, pageCount, user } = context;

  return dashboardBase(context,
    <div>
      <h1>Posts</h1>
      <div class="row">
        <div class="col-lg-10">

          <div class="form-group">
            <a href={links.routeUrl(null, "post", "create",
              { eventId: newPostEvent ? newPostEvent.get("id") : undefined })} class="btn btn-primary">Create post</a>
          </div>

          {navigationMacros.pagination(currentPage, pageCount, "/dashboard/posts?")}

          {ifTrue(draftPosts.length > 0, () =>
            <div>
              <h2>Drafts</h2>
              {draftPosts.map(post =>
                postMacros.post(post, { allowMods: true, readingUser: user, readingUserLikes: {} })
              )}

              <h2>Published</h2>
            </div>
          )}

          {publishedPosts.map(post =>
            postMacros.post(post, { allowMods: true, readingUser: user, readingUserLikes: {} })
          )}

          {ifTrue(publishedPosts.length === 0, () =>
            <div class="card card-body">No posts yet.</div>
          )}

          {navigationMacros.pagination(currentPage, pageCount, "/dashboard/posts?")}

        </div>
      </div>
    </div>);
}
