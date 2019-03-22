/* eslint-env jquery */
/* global Tablesort */

module.exports = function sortable () {
  $('table.sortable').each(function (index, element) {
    const tablesortOptions = $(element).data('tablesort-options') || {}
    new Tablesort(element, tablesortOptions) // eslint-disable-line no-new
  })
}
