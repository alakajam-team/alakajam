/* eslint-env jquery */

/**
 * Simple wrapper that lets you style <select> elements using the select2
 * library by simply adding a `js-select` class.
 */
module.exports = function select () {
  $('.js-select').each(function () {
    const $select = $(this)
    const placeholder = $select.attr('data-select-placeholder') || ''

    $select.select2({
      placeholder: placeholder,
      allowClear: true
    })
  })

  $('select').on('select2:unselecting', function (ev) {
    if (ev.params.args.originalEvent) {
      // When unselecting (in multiple mode)
      ev.params.args.originalEvent.stopPropagation()
    } else {
      // When clearing (in single mode)
      $(this).one('select2:opening', function (ev) { ev.preventDefault() })
    }
  })
}
