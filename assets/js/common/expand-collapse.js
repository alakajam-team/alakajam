/* eslint-env jquery */

module.exports = function expandCollapse () {
  $('.js-expand-bar').each(function () {
    var $this = $(this)
    var maxHeight = parseInt($this.attr('data-max-height'))
    var $parent = $this.parent()
    if ($parent.height() > maxHeight) {
      $parent.attr('style', 'max-height: ' + (maxHeight * 0.8) + 'px') // limit the size while preventing cropping just a single line
      $this.show()
      $this.click(function () {
        $parent.toggleClass('expanded')
      })
    } else {
      $this.remove()
    }
  })
}
