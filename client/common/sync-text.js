/* eslint-env jquery */

module.exports = function syncText (inputSelector, displaySelector, defaultText = null) {
  const $input = $(inputSelector)
  const $display = $(displaySelector)

  function refreshDisplay () {
    let text = $input.val()
    if (!text && typeof defaultText === 'string') {
      text = defaultText
    }
    $display.text(text)
  }
  $input.on('change keyup', refreshDisplay)
  refreshDisplay()
}
