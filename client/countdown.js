/* eslint-env jquery */

module.exports = function countdown (selector, endDateString) {
  const diffMs = Math.max(0, Date.parse(endDateString) - Date.now())
  const $jsCountdown = $(selector)
  $jsCountdown.show()
  $jsCountdown.FlipClock(diffMs / 1000, {
    clockFace: 'DailyCounter',
    countdown: true
  })
}
