import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import * as eventMacros from "server/event/event.macros";
import { ifTrue } from "server/macros/jsx-utils";

export function themeDetails(userTheme: BookshelfModel) {
  const themeStatus = userTheme ? userTheme.get("status") : undefined;
  return <p>
    {eventMacros.eventThemeStatus(userTheme)}
    {" "}
    {ifTrue(themeStatus !== "duplicate", () => {
      if (themeStatus === "out" || themeStatus === "banned") {
        return <span>Out after {userTheme.get("notes")} votes</span>;
      } else if (themeStatus !== "duplicate") {
        return <span>Rated {userTheme.get("notes")} time{userTheme.get("notes") !== 1 ? "s" : ""}</span>;
      }
    })}
  </p>;
}
