/* eslint-disable no-unused-expressions */

/**
 * http://tristen.ca/tablesort/demo/
 */
export default function sortable(): void {
  $("table.sortable").each((_index, element) => {
    const tablesortOptions = $(element).data("tablesort-options") || {};
    new Tablesort(element, tablesortOptions);
  });
}
