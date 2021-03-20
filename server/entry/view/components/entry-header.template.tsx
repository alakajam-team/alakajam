import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import links from "server/core/links";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { ifSet, ifTrue } from "server/macros/jsx-utils";

export default function entryHeader(entry: BookshelfModel, user: User, external: boolean): JSX.Element {
  return <>
    <h1>
      {entry.get("title")}
      {ifTrue(security.canUserWrite(user, entry), () =>
        <a class="btn btn-outline-primary ml-2" href={links.routeUrl(entry, "entry", "edit")}>Edit</a>
      )}
    </h1>
    {ifSet(entry.get("description"), () =>
      <p class="entry__description user-contents">
        {entry.get("description")}
      </p>
    )}
  </>;
}
