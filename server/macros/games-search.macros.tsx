import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as templatingFilters from "server/core/templating-filters";
import { nunjuckMacro } from "./nunjucks-macros";
import { BookshelfModel } from "bookshelf";

const GAMES_SEARCH_MACROS_PATH = "macros/form.macros.html";

export function searchForm(context: Object, options = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(GAMES_SEARCH_MACROS_PATH, "searchForm", [context, options])} />;
}

export function searchDescription(searchOptions, searchedEvent) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(GAMES_SEARCH_MACROS_PATH, "searchDescription", [searchOptions, searchedEvent])} />;
}
