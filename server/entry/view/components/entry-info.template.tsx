import { BookshelfCollection, BookshelfModel } from "bookshelf";
import { capitalize } from "lodash";
import React, { JSX } from "preact";
import * as templatingFilters from "server/core/templating-filters";
import { digits } from "server/core/templating-filters";
import * as eventMacros from "server/event/event.macros";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";

export default function entryInfo(entry: BookshelfModel, external: boolean): JSX.Element {
  return <>
    {ifTrue(entry.get("description"), () =>
      <div class="card card-body entry__description user-contents">
        {entry.get("description")}
      </div>
    )}

    {ifFalse(external, () =>
      <div>
        <div class="entry__info">
          <span class="entry__info-label">Division</span>
          <span class="entry__info-value">{capitalize(entry.get("division"))}</span>
        </div>
        <div class="entry__info">
          <span class="entry__info-label">Karma</span>
          <span class="entry__info-value">{digits(entry.get("karma"), 0)}</span>
        </div>
      </div>
    )}
    <div class="entry__info">
      <span class="entry__info-label">Platforms</span>
      <div class="entry__info-value">
        {(entry.get("platforms") || []).map(name =>
          <div class="entry__platform">{eventMacros.entryPlatformIcon(name, { hideLabel: true })}</div>
        )}
      </div>
    </div>
    {ifTrue(entry.related<BookshelfCollection>("tags").length > 0, () =>
      <div class="entry__info">
        <span class="entry__info-label">Tags</span>
        <div class="entry__info-value" style="width: 215px">
          {entry.related<BookshelfCollection>("tags").models.map(tag =>
            <a href={`/events/games?tags=${tag.get("id")}`} class="btn btn-outline-secondary btn-sm ml-1 mb-1">{tag.get("value")}</a>
          )}
        </div>
      </div>
    )}
    <div class="entry__info">
      <span class="entry__info-label">Published</span>
      <span class="entry__info-value">{templatingFilters.date(entry.get("published_at"))}</span>
    </div>
  </>;
}
