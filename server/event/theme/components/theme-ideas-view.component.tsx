import { BookshelfCollection, BookshelfModel } from "bookshelf";
import * as React from "preact";
import { User } from "server/entity/user.entity";
import { ifNotSet, ifTrue } from "server/macros/jsx-utils";
import { themeDetails } from "./theme-details.component";

export function themeIdeasView(user: User, event: BookshelfModel, userThemes: BookshelfCollection, maxThemeSuggestions: number, path: string) {
  return <div class="card themes__ideas">
    {ifTrue(user && event.get("status_theme") === "voting", () =>
      <div class="themes__idea">
        <p>
          <button class="btn btn-primary js-show js-hide"
            data-show-selector="#js-manage-themes"
            data-hide-selector="#js-view-themes">
            <span class="fas fa-pencil-alt mr-1"></span>
          Manage theme ideas
          </button>
        </p>
      </div>
    )}
    {userThemes.map(userTheme =>
      <div class="themes__idea">
        <div class="themes__idea-label">
          {userTheme.get("title")}
        </div>
        {userTheme ? themeDetails(userTheme) : undefined}
      </div>
    )}
    {ifTrue(userThemes.length === 0, () =>
      <div class="themes__idea">
        {ifTrue(event.get("status_theme") === "voting", () =>
          <div>
            <p style="margin-bottom: 10px">None yet. You can submit up to {maxThemeSuggestions} ideas.</p>
            {ifNotSet(user, () =>
              <p><a href={`/login?redirect=${encodeURIComponent(path)}`} class="btn btn-primary">Login to submit ideas</a></p>
            )}
          </div>
        )}
        {ifTrue(event.get("status_theme") !== "voting", () => {
          if (user) {
            return "You didn't submit theme ideas.";
          } else {
            return <p><a href={`/login?redirect=${encodeURIComponent(path)}`} class="btn btn-primary">Login to view your ideas</a></p>;
          }
        })}
      </div>
    )}
  </div>;
}
