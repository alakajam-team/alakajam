/* eslint-env jquery */

/**
 * Sets up event listeners that show/hide elements if an input field is
 * (non)empty, based on a selector stored in a data attribute.
 */
module.exports = function showIfNonempty (inputSelector) {
  $(inputSelector)
    .change(function (event) {
      const $input = $(event.target)
      const showElementSelector = $input.attr('data-show-if-nonempty-selector')
      $(showElementSelector).toggle(!!$input.val())
    })
    .trigger('change')
}
