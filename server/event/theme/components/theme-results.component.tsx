import { BookshelfModel } from "bookshelf";
import React from "preact";
import { ordinal } from "server/core/formats";
import { ifFalse, ifSet, ifTrue } from "server/macros/jsx-utils";

export function themeResults(event: BookshelfModel, shortlist: BookshelfModel[], userRanks: number[]) {
  return <div class="themes__results">
    <h2>Shortlist results</h2>
    <div class="card card-body">
      <p>
        {ifFalse(event.related("details").get("flags")?.hideThemeResultsDetails, () =>
          <>
            {ifSet(userRanks, () =>
              <span class="theme-shortlist-line__score">Your picks</span>
            )}
            <span class="theme-shortlist-line__score d-none d-sm-block">Score</span>
          </>
        )}
        {ifTrue(shortlist.length > 0, () =>
          <span>The theme of the <em>{event.get("title")}</em> is <strong>{shortlist[0].get("title")}</strong>.
              Here are the detailed voting results:</span>
        )}
      </p>
      <ol>
        {shortlist.map((theme, index) =>
          <li class={"theme-shortlist-line " + (index === 0 ? "winner" : "")}>
            <span class="theme-shortlist-line__label">{theme.get("title")}</span>
            {ifFalse(event.related("details").get("flags")?.hideThemeResultsDetails, () =>
              <>
                {ifSet(userRanks, () =>
                  <span class="theme-shortlist-line__ranking">{ordinal(userRanks[theme.get("id")])}</span>
                )}
                <span class="theme-shortlist-line__score d-none d-sm-block">
                  {theme.get("score") > 0 ? "+" : ""}{theme.get("score")}
                </span>
              </>
            )}
          </li>
        )}
      </ol>
    </div>
  </div>;
}
