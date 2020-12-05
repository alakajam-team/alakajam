import { BookshelfModel } from "bookshelf";
import { capitalize, range } from "lodash";
import React, { JSX } from "preact";
import { ordinal } from "server/core/formats";
import links from "server/core/links";
import { digits } from "server/core/templating-filters";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";

export function entryRatingResults(entry: BookshelfModel, event: BookshelfModel): JSX.Element {
  let hasRatings = false;
  const details = entry.related("details");
  const entriesInDivision = event.related("details").get("division_counts")[entry.get("division")];

  return <div class="entry-results">
    <h2 class="entry-results__header"><a name="results"></a>Voting results</h2>
    <div class="entry-results__body">
      <p>
        {event.related("details").get("category_titles").map((categoryTitle, index) => {
          hasRatings = true;
          const categoryIndex = index + 1;
          const ranking = details.get("ranking_" + categoryIndex);
          const rating = details.get("rating_" + categoryIndex);

          if (ranking) {
            const percentage = (ranking - 1.) / entriesInDivision * 100;

            return <div class="entry-results__category">
              <div class="entry-results__category-title">{categoryTitle}</div>
              <div class="entry-results__category-ranking">
                <a href={`${links.routeUrl(event, "event", "results")}?sortBy=${categoryIndex}&division=${entry.get("division")}`}>
                  {ifTrue(ranking <= 3, () =>
                    <span class={`entry-results__category-medal medal-category-${categoryIndex} medal-ranking-${ranking} in-picture`}></span>
                  )}
                  {ordinal(ranking)}
                </a>
              </div>
              <div class="entry-results__category-rating d-none d-sm-inline-block">{percentage > 0 ? digits(percentage, 0) + "%" : ""}</div>
              <div class="entry-results__category-rating">{digits(rating, 3)}</div>
              <div class="entry-results__category-stars d-none d-sm-inline-block">
                {range(1, 11).map(i =>
                  <span class={"fa-lg " + ((i <= rating) ? "fas fa-star" : "far fa-star")}></span>
                )}
              </div>
            </div>;
          }
        })}
      </p>

      {ifTrue(hasRatings, () =>
        <div>
          This game entered in the <strong>{capitalize(entry.get("division"))}</strong> competition
          (<strong>{entriesInDivision}</strong> entries).
        </div>
      )}
      {ifFalse(hasRatings, () =>
        <div>This entry did not get enough ratings to be ranked.</div>
      )}
    </div>
  </div>;
}
