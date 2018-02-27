/* eslint-env jquery */

function disableOpenMenuOnClear () {
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

module.exports = () => {
  disableOpenMenuOnClear()
}
