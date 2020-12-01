import { BookshelfModel, EntryBookshelfModel } from "bookshelf";
import { range } from "lodash";
import * as React from "preact";
import links from "server/core/links";
import { ifSet, ifTrue } from "server/macros/jsx-utils";

export function entryPicture(entry: EntryBookshelfModel, event: BookshelfModel) {
  const hasPictures = entry.picturePreviews().length > 0;
  const mainPicture = hasPictures ? links.pictureUrl(entry.picturePreviews()[0], entry) : links.staticUrl("/static/images/default-entry.png");

  const details = entry.related("details");

  return <div class={`entry__picture${hasPictures ? "" : " empty"}`} style={`background-image: url('${mainPicture}')`}>
    {ifTrue(event && event.get("status_results") === "results" && entry.get("division") !== "unranked", () =>
      <div class="entry-medals">
        {ifSet(details, () =>
          range(1, 7).map(categoryIndex => {
            const ranking = details.get("ranking_" + categoryIndex);
            if (ranking && ranking <= 3) {
              return <a href="#results">
                <span class={`entry-results__category-medal medal-category-${categoryIndex} medal-ranking-${ranking} in-picture`}></span>
              </a>;
            }
          })
        )}
      </div>
    )}
  </div>;
}
