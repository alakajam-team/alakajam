/* eslint-env jquery */

function init () {
  // Schedule actions
  const $scheduleShowButton = $('#schedule-show')
  const $scheduleHideButton = $('#schedule-hide')
  const $scheduleBlock = $('.post__schedule')
  const $actionsBlock = $('.post__actions')
  $scheduleShowButton.click(function () {
    $scheduleBlock.show()
    $actionsBlock.hide()
  })
  $scheduleHideButton.click(function () {
    $scheduleBlock.hide()
    $actionsBlock.show()
  })

  // Sync H1 with title input
  const $titleInput = $('#title')
  const $titleDisplay = $('#title-display')
  const defaultText = $titleDisplay.attr('data-default-text')
  $titleInput.on('change keyup', refreshTitleDisplay)
  refreshTitleDisplay()

  function refreshTitleDisplay () {
    $titleDisplay.text($titleInput.val() || defaultText)
  }
}

module.exports = {
  init
}
