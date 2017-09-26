/* eslint-env jquery */

function init () {
  $('.has-tooltip').each(function () {
    const $this = $(this)
    $this.attr('data-delay', '{"show":"300", "hide":"0"}')
    $this.tooltip()
  })
}

module.exports = {
  init
}
