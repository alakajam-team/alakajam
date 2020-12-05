import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import links from "server/core/links";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { ifTrue } from "server/macros/jsx-utils";

export default function entryHeader(entry: BookshelfModel, user: User, external: boolean): JSX.Element {
  return <h1>
    {entry.get("title")}
    {ifTrue(security.canUserWrite(user, entry), () =>
      <a class="btn btn-outline-primary ml-2" href={links.routeUrl(entry, "entry", "edit")}>Edit</a>
    )}
    {ifTrue(external, () =>
      <h2 style="margin-top: -5px; margin-bottom: 20px">
        <span class="badge badge-sm badge-primary">External entry</span>{" "}
        {ifTrue(entry.get("external_event"), () =>
          <span>Made for <i>{entry.get("external_event")}</i></span>
        )}
      </h2>
    )}
  </h1>;
}
