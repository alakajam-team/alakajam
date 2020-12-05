import { BookshelfModel } from "bookshelf";
import { range } from "lodash";
import React, { JSX } from "preact";
import { digits } from "server/core/templating-filters";
import { ifTrue } from "server/macros/jsx-utils";
import { entryRatingCountPhrase } from "./entry-rating-count-phrase.template";

export function entryRatingForm(entry: BookshelfModel, entryVotes: number, event: BookshelfModel,
  csrfToken: () => JSX.Element, vote: BookshelfModel): JSX.Element {
  const optouts = entry.related("details").get("optouts") || [];

  return <form action="" method="post">
    {csrfToken()}

    <div class="float-right">
      <div class="show-if-saving"><i class="fas fa-spinner fa-spin" title="Saving…"></i></div>
      <div class="show-if-saving-success"><i class="fas fa-check-circle" title="Ratings saved successfully"></i></div>
      <div class="show-if-saving-error"><i class="fas fa-times-circle"></i> <span class="js-saving-error-text"></span></div>
    </div>

    {entryRatingCountPhrase(entry, entryVotes)}

    <input type="hidden" name="action" value="vote" />
    <div>
      {event.related("details").get("category_titles").map((categoryTitle, index) => {
        const categoryIndex = index + 1;
        const categoryRating = vote ? vote.get("vote_" + categoryIndex) : undefined;
        return <div class="entry-voting__category">
          <input type="hidden" id={"js-vote-" + categoryIndex} name={"vote-" + categoryIndex}
            value={digits(categoryRating || 0, 3)} autocomplete="off" />
          <div class="entry-voting__category-title">{categoryTitle}</div>
          <div id={"js-vote-label-" + categoryIndex} class="entry-voting__category-rating confirmed">
            &nbsp;{categoryRating > 0 ? digits(categoryRating, 0) : ""}</div>
          <div class="entry-voting__category-stars">
            <span data-category={categoryIndex} data-rating="0"
              class={"js-star far fa-lg fa-circle " + (!categoryRating ? "confirmed" : "")}></span>
            {ifTrue(optouts.includes(categoryTitle), () =>
              <span>Opted out (<a href="/article/docs/faq#optouts">what?</a>)</span>
            )}
            {ifTrue(!optouts.includes(categoryTitle), () =>
              range(1, 11).map(i =>
                <span data-category={categoryIndex} data-rating={i}
                  class={"js-star fa-lg " + (i <= categoryRating ? "fas fa-star confirmed" : "far fa-star")}></span>
              )
            )}
          </div>
        </div>;
      })}
    </div>
  </form>;
}
