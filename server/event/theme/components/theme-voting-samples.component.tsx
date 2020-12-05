import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";

export function themeVotingSamples(sampleThemes: BookshelfModel[], votingAllowed: boolean, ideasRequired: number,
  path: string): JSX.Element | string {
  if (votingAllowed) {
    return <div>
      <p>Here are some of the ideas submitted to the event.
        <a href={`/login?redirect=${encodeURI(path)}`} class="btn btn-primary ml-1">Login to vote</a></p>
      {sampleThemes.map(theme =>
        <div class="card card-body mb-3"><h1 class="m-0">{theme.get("title")}</h1></div>
      )}
    </div>;
  } else {
    return `Voting will start when at least ${ideasRequired} ideas are submitted.`;
  }
}
