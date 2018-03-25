/* eslint-env jquery */

module.exports = function syncText (inputSelector) {
  $(inputSelector)
    .on('change keyup', function (event) {
      const $input = $(event.target)
      const defaultText = $input.attr('data-sync-text-default')
      const text = $input.val() || defaultText || ''
      const $display = $($input.attr('data-sync-text-display-selector'))
      $display.text(text)
    })
    .trigger('change')
}
