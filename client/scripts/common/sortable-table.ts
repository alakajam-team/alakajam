/* eslint-disable no-unused-expressions */

export default function sortable(): void {
  $("table.sortable").each((_index, element) => {
    const tablesortOptions = $(element).data("tablesort-options") || {};
    new Tablesort(element, tablesortOptions);
  });
}
