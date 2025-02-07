import { BookshelfCollection, BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import links from "server/core/links";
import * as templatingFilters from "server/core/templating-filters";
import { digits } from "server/core/templating-filters";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";
import { divisionLabel } from "./division-label";

export default function entryMetadata(entry: BookshelfModel, external: boolean, event?: BookshelfModel): JSX.Element {
  return <div class="mb-4">
    <div class="entry__info">
      <span class="entry__info-label">Platforms</span>
      <div class="entry__info-value">
        {(entry.get("platforms") || []).map(name =>
          <div class="entry__platform">{eventMacros.entryPlatformIcon(name, { hideLabel: true })}</div>
        )}
      </div>
    </div>
    {ifTrue(entry.related<BookshelfCollection>("tags").length > 0, () =>
      <div class="entry__info mb-0">
        <span class="entry__info-label">Tags</span>
        <div class="entry__info-value" style="width: 215px">
          {entry.related<BookshelfCollection>("tags").models.map(tag =>
            <a href={`/explore/games?tags=${tag.get("id")}`} class="btn btn-outline-secondary btn-sm ml-1 mb-1">{tag.get("value")}</a>
          )}
        </div>
      </div>
    )}
    <div class="entry__info">
      <span class="entry__info-label">Submitted to</span>
      <span class="entry__info-value">{eventName(entry, external, event)}</span>
    </div>
    <div class="entry__info">
      <span class="entry__info-label">Published</span>
      <span class="entry__info-value">{templatingFilters.date(entry.get("published_at"))}</span>
    </div>
    {ifFalse(external, () =>
      <>
        <div class="entry__info">
          <span class="entry__info-label">Division</span>
          <span class="entry__info-value">{divisionLabel(entry.get("division"))}</span>
        </div>
        <div class="entry__info">
          <span class="entry__info-label">
            Karma {formMacros.tooltip("A high karma means that the game authors have given more ratings and comments than they received. "
            + "This leads to the game being more visible in certain pages.")}
          </span>
          <span class="entry__info-value">{digits(entry.get("karma"), 0)}</span>
        </div>
      </>
    )}
  </div>;
}

function eventName(entry: BookshelfModel, external: boolean, event?: BookshelfModel): JSX.Element {
  if (external) {
    return entry.get("external_event");
  } else {
    return <a href={links.routeUrl(event, "event")}>{event.get("title")}</a>;
  }
}
