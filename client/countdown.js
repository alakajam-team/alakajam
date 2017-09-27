/* eslint-env jquery */

function show (selector, endDateString) {
  const diffMs = Math.max(0, Date.parse(endDateString) - Date.now())
  const $jsCountdown = $(selector)
  $jsCountdown.show()
  $jsCountdown.FlipClock(diffMs / 1000, {
    clockFace: 'DailyCounter',
    countdown: true
  })
}

module.exports = {
  show
}
