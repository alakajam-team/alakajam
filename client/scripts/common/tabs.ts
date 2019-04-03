
/**
 * Interactivity for a set of tabs, exactly one of which is visible at any time.
 * XXX: the current implementation permits only one set of tabs per page.
 *
 * <div class="panel">
 *   <ul class="nav nav-tabs nav-justified">
 *     <li role="presentation" class="js-tab-container active">
 *        <a class="js-tab-button" href="#tab1" data-tab-selector="#js-tab-1">Tab 1</a>
 *     </li>
 *     <li role="presentation" class="js-tab-container">
 *        <a class="js-tab-button" href="#tab2" data-tab-selector="#js-tab-2">Tab 2</a>
 *     </li>
 *   </ul>
 *   <div id="js-tab-1" class="tab-content js-tab js-tab-active"></div>
 *   <div id="js-tab-2" class="tab-content js-tab"></div>
 * </div>
 */
export default function tabs(options) {
  const { buttonContainerSelector, buttonSelector, tabSelector } = options;

  // Bind click to switch tabs
  $(buttonSelector).click(function() {
    const $this = $(this);
    const activeTabSelector = $this.attr("data-tab-selector");

    $(buttonContainerSelector).removeClass("active");
    $this.parent(buttonContainerSelector).addClass("active");
    $(tabSelector).removeClass("js-tab-active");
    $(activeTabSelector).addClass("js-tab-active");
  });

  // Display a tab on load
  let activeTabFound = false;
  $(buttonSelector).each(function() {
    const $this = $(this);
    if (!activeTabFound && window.location.hash === $this.attr("href")) {
      $this.click();
      activeTabFound = true;
    }
  });
  if (!activeTabFound) {
    $(buttonSelector).eq(0).click();
  }
}
