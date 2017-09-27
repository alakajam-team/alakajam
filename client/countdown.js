/* eslint-env jquery */

function show (selector, endDateString) {
  var diffMs = Math.max(0, Date.parse(endDateString) - Date.now())
  var $jsCountdown = $(selector)
  $jsCountdown.show()
  $jsCountdown.FlipClock(diffMs / 1000, {
    clockFace: 'DailyCounter',
    countdown: true
  })
}

module.exports = {
  show
}
