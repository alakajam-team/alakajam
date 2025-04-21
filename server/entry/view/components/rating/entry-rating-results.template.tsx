import { BookshelfModel } from "bookshelf";
import { range } from "lodash";
import React, { JSX } from "preact";
import { ordinal } from "server/core/formats";
import links from "server/core/links";
import { digits } from "server/core/templating-filters";
import { divisionLabel } from "../division-label";

export function entryRatingResults(entry: BookshelfModel, event: BookshelfModel): JSX.Element {
  const entriesInDivision = event.related("details").get("division_counts")[entry.get("division")];

  const entryResults = formatEntryResults(event, entry);
  const hasRankings = entryResults.some(category => category.ranking);

  return <div class="entry-results">
    <h2 class="entry-results__header"><a id="results"></a>Voting results</h2>
    <div class="entry-results__body">
      <p>
        {entryResults.map(category => {
          if (category.ranking) {
            const percentage = (category.ranking - 1.) / entriesInDivision * 100;

            return <div class="entry-results__category">
              <div class="entry-results__category-title">{category.categoryTitle}</div>
              <div class="entry-results__category-ranking">
                <a href={`${links.routeUrl(event, "event", "results")}?sortBy=${category.categoryIndex}&division=${entry.get("division")}`}>
                  {category.ranking <= 3 &&
                    <span class={`entry-results__category-medal medal-category-${category.categoryIndex} `
                      + ` medal-ranking-${category.ranking} in-picture`}></span>}
                  {ordinal(category.ranking)}
                </a>
              </div>
              <div class="entry-results__category-rating d-none d-sm-inline-block">{percentage > 0 ? digits(percentage, 0) + "%" : ""}</div>
              <div class="entry-results__category-rating">{digits(category.rating, 3)}</div>
              <div class="entry-results__category-stars d-none d-sm-inline-block">
                {range(1, 11).map(i =>
                  <span class={"fa-lg " + ((i <= category.rating) ? "fas fa-star" : "far fa-star")}></span>
                )}
              </div>
            </div>;
          }
        })}
      </p>

      <div>
        This game entered in the <strong>{divisionLabel(entry.get("division"))}</strong> competition
        (<strong>{entriesInDivision}</strong> entries){!hasRankings && ", but did not get enough ratings to be ranked"}.
      </div>
    </div>
  </div>;
}

interface CatagoryResults {
  categoryIndex: number;
  categoryTitle: string;
  rating: number;
  ranking?: number;
}

function formatEntryResults(event: BookshelfModel, entry: BookshelfModel): CatagoryResults[] {
  const entryDetails = entry.related("details");

  return event.related("details").get("category_titles").map((categoryTitle, index) => {
    const categoryIndex = index + 1;
    const ranking = entryDetails.get("ranking_" + categoryIndex);
    const rating = entryDetails.get("rating_" + categoryIndex);

    return {
      categoryIndex,
      categoryTitle,
      ranking,
      rating
    };
  });
}
