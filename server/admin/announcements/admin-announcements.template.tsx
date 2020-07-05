import * as React from "preact";
import links from "server/core/links";
import { ifSet, ifTrue } from "server/macros/jsx-utils";
import * as navigationMacros from "server/macros/navigation.macros";
import * as postMacros from "server/post/post.macros";
import adminBase from "../admin.base";
import { AdminAnnouncementContext } from "./admin-announcements.controller";

export default function render(context: AdminAnnouncementContext) {
  const { draftPosts, publishedPosts, currentPage, pageCount, featuredEvent, user, userLikes } = context;

  return adminBase(context,
    <div>
      <h1>Announcements</h1>

      <div class="form-group">
        {ifSet(featuredEvent, () =>
          <a href={links.routeUrl(undefined, "post", "create", { eventId: featuredEvent.id, specialPostType: "announcement" })}
            class="btn btn-warning mr-1">
            Create (on featured <b>{featuredEvent.get("title")}</b>)
          </a>)}
        <a href="{{ routeUrl(null, 'post', 'create', { specialPostType: 'announcement' }) }}" class="btn btn-warning mr-1">Create (no event)</a>
        <a href="{{ routeUrl(null, 'post', 'create', { specialPostType: 'hidden' }) }}" class="btn btn-warning">Create hidden post</a>
      </div>

      {navigationMacros.pagination(currentPage, pageCount, "/admin?")}

      {ifTrue(draftPosts.length > 0, () => <div>
        <h2>Drafts</h2>
        {draftPosts.map(post =>
          postMacros.post(post, { allowMods: true, hideBody: true, readingUser: user, readingUserLikes: userLikes, smallTitle: true })
        )}
        <h2>Published</h2>
      </div>)}

      {publishedPosts.map(post =>
        postMacros.post(post, { allowMods: true, hideBody: true, readingUser: user, readingUserLikes: userLikes, smallTitle: true })
      )}

      {ifTrue(publishedPosts.length === 0, () =>
        <div class="card card-body">Nothing yet!</div>
      )}

      {navigationMacros.pagination(currentPage, pageCount, "/admin?")}
    </div>);
}
