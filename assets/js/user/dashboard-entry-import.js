/* eslint-env jquery */

module.exports = function dashboardEntryImport () {
  const $importer = $('.js-importer')
  $importer.select2({
    placeholder: 'Select a website to import from',
    allowClear: true
  })
}
