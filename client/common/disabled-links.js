/* eslint-env jquery */

module.exports = function disabledLinks (selector) {
  $(selector).click(function (e) {
    e.preventDefault()
  })
}
