import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import { divisionLabel } from "../division-label";

export function entryRatingCountPhrase(entry: BookshelfModel, entryVotes: number): JSX.Element {
  return <p>
    This <strong>{divisionLabel(entry.get("division"))}</strong> entry has received&nbsp;
    <strong>{entryVotes}</strong> rating{entryVotes !== 1 ? "s" : ""} so far.
  </p>;
}
