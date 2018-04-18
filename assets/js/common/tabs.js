/* eslint-env jquery */

/**
 * Interactivity for a set of tabs, exactly one of which is visible at any time.
 * XXX: the current implementation permits only one set of tabs per page.

<div class="panel">
  <ul class="nav nav-tabs nav-justified">
    <li role="presentation" class="js-tab-container active"><a class="js-tab-button" href="#" data-tab-selector="#js-tab-1">Tab 1</a></li>
    <li role="presentation" class="js-tab-container"><a class="js-tab-button" href="#" data-tab-selector="#js-tab-2">Tab 2</a></li>
  </ul>
  <div id="js-tab-1" class="tab-content js-tab js-tab-active"></div>
  <div id="js-tab-2" class="tab-content js-tab"></div>
</div>

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
