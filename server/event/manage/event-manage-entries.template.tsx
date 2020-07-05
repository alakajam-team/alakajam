import { capitalize } from "lodash";
import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import * as eventMacros from "server/event/event.macros";
import { ifTrue } from "server/macros/jsx-utils";
import { eventManageBase } from "./event-manage.base.template";

export default function render(context: CommonLocals) {
  const { entries, detailedEntryInfo, entriesById, usersById, event } = context;

  return eventManageBase(context, <div>
    <h1>{event.get("title")} entries <span class="count">({entries.length})</span></h1>

    {ifTrue(detailedEntryInfo.id, () =>
      detailedEntry(detailedEntryInfo, entriesById, usersById)
    )}

    <p>
      <a href="?orderBy=karma" class="btn btn-outline-secondary">Order by Karma</a>
      <a href="?orderBy=ratingCount" class="btn btn-outline-secondary">Order by rating count</a>
    </p>

    <ol>
      <table class="table sortable">
        <thead>
          <tr>
            <th></th>
            <th>Game</th>
            <th>Division</th>
            <th>Karma</th>
            <th>Votes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry =>
            <tr>
              <td>
                <li></li>
              </td>
              <td>
                {eventMacros.entrySmallThumb(entry)}
              </td>
              <td>{capitalize(entry.get("division"))}</td>
              <td>{entry.get("karma")}</td>
              <td>{entry.get("division") !== "unranked" ? entry.related("details").get("rating_count") : "N.A."}</td>
              <td><a href="?entryDetails={entry.get('id') }}&amp;orderBy={{ orderBy}" class="btn btn-outline-primary">Details</a></td>
            </tr>
          )}
        </tbody>
      </table>
    </ol>
  </div>
  );
}

function detailedEntry(detailedEntryInfo, entriesById, usersById) {
  const entry = entriesById[detailedEntryInfo.id];

  return <div class="card card-body">
    <h2>Karma details: {entry.get("title")}</h2>

    <p>Current karma: <strong>{detailedEntryInfo.total}</strong></p>

    <h4>Given <span class="count">(+{detailedEntryInfo.given.total})</span></h4>

    <ul>
      {detailedEntryInfo.given.givenByUserAndEntry.map((_, data) =>
        <li>
          {ifTrue(data.commentKarma > 0, () =>
            <span>
              <strong>+ {data.commentKarma || "0"}</strong> with comments by {userTitle(usersById, data.userId)}
                on {entriesById[data.entryId] ? entriesById[data.entryId].get("title") : "???"}
            </span>
          )}
          {data.commentKarma && data.voteKarm ? " or " : ""}
          {ifTrue(data.voteKarma > 0, () =>
            <span>
              <strong>+ {data.voteKarma || "0"}</strong> with votes by {userTitle(usersById, data.userId)}
                on {entriesById[data.entryId] ? entriesById[data.entryId].get("title") : "???"}
            </span>
          )}
        </li>
      )}
    </ul>

    <h4>Received <span class="count">(-{detailedEntryInfo.received.total})</span></h4>

    <ul>
      {detailedEntryInfo.received.receivedByUser.map((userId, data) =>
        <li>
          {ifTrue(data.commentKarma > 0, () =>
            <span>
              <strong>- {data.commentKarma || "0"}</strong> with comments by {userTitle(usersById, userId)}
            </span>
          )}
          {data.commentKarma && data.voteKarma ? " or " : ""}
          {ifTrue(data.voteKarma > 0, () =>
            <span>
              <strong>- {data.voteKarma || "0"}</strong> with votes by {userTitle(usersById, userId)}
            </span>
          )}
        </li>
      )}
    </ul>
  </div>;
}

function userTitle(usersById, userId) {
  if (usersById[userId]) {
    return usersById[userId].get("title") || usersById[userId].get("name");
  } else {
    return `non-entrant of ID ${userId}`;
  }
}
