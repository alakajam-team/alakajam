/* eslint-env jquery */

function init (options) {
  const { buttonContainerSelector, buttonSelector, tabSelector } = options
  $(buttonSelector).click(function () {
    var $this = $(this)
    var activeTabSelector = $this.attr('data-tab-selector')

    $(buttonContainerSelector).removeClass('active')
    $this.parent(buttonContainerSelector).addClass('active')
    $(tabSelector).hide()
    $(activeTabSelector).show()
  })
}

module.exports = {
  init
}
