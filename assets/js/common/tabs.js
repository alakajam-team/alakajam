/* eslint-env jquery */

/**
 * Interactivity for a set of tabs, exactly one of which is visible at any time.
 * XXX: the current implementation permits only one set of tabs per page.
 */
module.exports = function tabs (options) {
  const { buttonContainerSelector, buttonSelector, tabSelector } = options
  $(buttonSelector).click(function () {
    var $this = $(this)
    var activeTabSelector = $this.attr('data-tab-selector')

    $(buttonContainerSelector).removeClass('active')
    $this.parent(buttonContainerSelector).addClass('active')
    $(tabSelector).removeClass('js-tab-active')
    $(activeTabSelector).addClass('js-tab-active')
  })
  $(buttonSelector).eq(0).click()
}
