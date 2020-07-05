import * as React from "preact";
import { nunjuckMacro } from "./nunjucks-macros";

const GAMES_SEARCH_MACROS_PATH = "macros/form.macros.html";

export function searchForm(context: Record<string, any>, options = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(GAMES_SEARCH_MACROS_PATH, "searchForm", [context, options])} />;
}

export function searchDescription(searchOptions, searchedEvent) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(GAMES_SEARCH_MACROS_PATH, "searchDescription", [searchOptions, searchedEvent])} />;
}
