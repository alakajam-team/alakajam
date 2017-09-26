/* eslint-env jquery */

function toggleShowHide (showButtonSelector, hideButtonSelector, showSelector, hideSelector) {
  // Schedule actions
  const $showButton = $(showButtonSelector)
  const $hideButton = $(hideButtonSelector)
  const $show = $(showSelector)
  const $hide = $(hideSelector)
  $showButton.click(function () {
    $show.show()
    $hide.hide()
  })
  $hideButton.click(function () {
    $show.hide()
    $hide.show()
  })
}

function syncTitle(inputSelector, displaySelector, defaultText) {
  const $input = $(inputSelector)
  const $display = $(displaySelector)

  function refreshDisplay () {
    $display.text($input.val() || defaultText)
  }
  $input.on('change keyup', refreshDisplay)
  refreshDisplay()
}

module.exports = {
  toggleShowHide,
  syncTitle
}
