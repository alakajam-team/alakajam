import { range } from "lodash";
import React, { JSX } from "preact";
import { ifTrue } from "./jsx-utils";

export function pagination(currentPage = 1, pageCount = 1, baseUrl = "/posts?"): JSX.Element {
  const baseUrlQS = paginationBasePath(baseUrl);
  const pagesToEnd = pageCount - currentPage;
  const from = Math.max(1, currentPage - Math.max(5, 11 - pagesToEnd));
  const to = Math.min(pageCount, currentPage + Math.max(5, 11 - currentPage));

  // TODO: make a way to reach first / last page when there are many pages

  if (pageCount > 1) {
    return <ul class="pagination">
      {ifTrue(currentPage > 1, () =>
        <li class="page-item">
          <a class="page-link" href={baseUrlQS + "&p=" + (currentPage - 1)}>Previous page</a>
        </li>
      )}
      {range(from, to + 1).map(page =>
        <li class={"page-item d-sm-block " + (currentPage === page ? "active" : "d-none")}>
          <a class="page-link" href={baseUrlQS + "&p=" + page}>{page}</a>
        </li>
      )}
      {ifTrue(currentPage < pageCount, () =>
        <li class="page-item">
          <a class="page-link" href={baseUrlQS + "&p=" + (currentPage + 1)}>Next page</a>
        </li>
      )}
    </ul>;
  }
}

function paginationBasePath(pagePath: string) {
  let basePath = pagePath.replace(/[?&]p=[^&]*/g, "");
  if (!basePath.includes("?")) {
    basePath += "?";
  }
  return basePath;
}
