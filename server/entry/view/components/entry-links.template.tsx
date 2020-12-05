import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import links from "server/core/links";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { ifTrue } from "server/macros/jsx-utils";

export default function entryLinks(entry: BookshelfModel, user: User): JSX.Element {
  return <div class="entry__links">
    {ifTrue(security.canUserWrite(user, entry), () =>
      <a class="btn btn-outline-primary" href={links.routeUrl(entry, "entry", "edit")}>Edit entry</a>
    )}
    {(entry.get("links") || []).map(link =>
      <a class="btn btn-primary" href={link.url} target="_blank">
        <span class="fas fa-external-link"></span>
        {link.label}
      </a>
    )}
    {ifTrue((entry.get("links") || []).length === 0 || !entry.get("links")[0].url, () =>
      <div class="card card-body">No links yet.</div>
    )}
  </div>;
}
