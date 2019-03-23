// tslint:disable: no-unused-expression no-unused-expressions

export default function sortable() {
  $("table.sortable").each((index, element) => {
    const tablesortOptions = $(element).data("tablesort-options") || {};
    new Tablesort(element, tablesortOptions);
  });
}
