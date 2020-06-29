import * as React from "preact";
import { nunjuckMacro } from "./nunjucks-macros";

const NAVIGATION_MACROS_PATH = "macros/navigation.macros.html";

export function pagination(currentPage = 1, pageCount = 1, baseUrl = '/posts?') {
  return <div dangerouslySetInnerHTML={nunjuckMacro(NAVIGATION_MACROS_PATH, "pagination", [currentPage, pageCount, baseUrl])} />
}
