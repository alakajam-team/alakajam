import { BookshelfCollection, BookshelfModel } from "bookshelf";
import { range } from "lodash";
import React, { JSX } from "preact";
import links from "server/core/links";
import { ifTrue } from "server/macros/jsx-utils";
import { themeDetails } from "./theme-details.component";

export function themeIdeasForm(event: BookshelfModel, userThemes: BookshelfCollection, maxThemeSuggestions: number): JSX.Element {
  const ideaRows = Math.max(userThemes.length, maxThemeSuggestions);

  return <div class="card themes__ideas">
    {range(0, ideaRows).map(index => {
      const userTheme = userThemes.length > index ? userThemes[index] : undefined;
      return <div class={"themes__idea " + (userTheme ? "form-inline" : "")}>
        <input type="text" id={"idea-title-" + index} name={`idea-title[${index}]`}
          class="form-control input-lg" readonly={Boolean(userTheme)}
          placeholder={"Idea " + (index + 1)} value={userTheme ? userTheme.get("title") : ""} />
        {ifTrue(userTheme, () =>
          ifTrue(userTheme.get("status") === "duplicate" || userTheme.get("status") === "active", () =>
            <button type="button" class="js-idea-delete themes__idea-delete form-control btn btn-outline-danger ml-1">
              <span class="fas fa-trash"></span>
            </button>
          )
        )}
        <input type="hidden" name={`idea-id[${index}]`} value={userTheme ? userTheme.get("id") : ""} />
        {userTheme ? themeDetails(userTheme) : undefined}
      </div>;
    })}
    <div class="form-group themes__idea mt-0 mb-0">
      <input type="hidden" name="action" value="ideas" />
      <input type="hidden" name="idea-rows" value={ideaRows} />
      <input type="submit" class="btn btn-primary mr-1" value="Save" />
      <a href={links.routeUrl(event, "event", "themes")} class="btn btn-outline-secondary">Cancel</a>
    </div>
  </div>;
}
