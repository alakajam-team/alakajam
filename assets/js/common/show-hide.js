/* eslint-env jquery */

/**
 * Sets up event listeners that show/hide elements on click, based on a
 * selector stored in a data attribute.
 */
module.exports = function init (showButtonSelector, hideButtonSelector) {
  $(showButtonSelector).click(function (event) {
    const showElementSelector = $(event.target).attr('data-show-selector')
    $(showElementSelector).show()
  })
  $(hideButtonSelector).click(function (event) {
    const hideElementSelector = $(event.target).attr('data-hide-selector')
    $(hideElementSelector).hide()
  })
}
