import { BookshelfCollection, BookshelfModel, EntryBookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { ifTrue } from "server/macros/jsx-utils";
import * as userMacros from "server/user/user.macros";

export function entryAuthors(entry: EntryBookshelfModel, user: User): JSX.Element {
  return <>
    <h3>Author{entry.related<BookshelfCollection>("userRoles").models.length > 1 ? "s" : ""}</h3>

    <div class="card card-body pb-2 mb-4">
      {entry.sortedUserRoles().map(userRole =>
        userMacros.userThumb(userRole.related<BookshelfModel>("user"), { fullWidth: true })
      )}
      {ifTrue(security.canUserWrite(user, entry), () =>
        entry.related<BookshelfCollection>("invites").models.map(invite =>
          userMacros.userThumb(invite.related<BookshelfModel>("invited"), { fullWidth: true, pending: true })
        )
      )}
    </div>
  </>;
}
