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

module.exports = {
  toggleShowHide
}
