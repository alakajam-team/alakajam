/* eslint-env jquery */

module.exports = function expandCollapse () {
  $('.js-expand-bar').each(function () {
    LimitExpandContent($(this), $(this).parent())
  })

  $('.expandable img').on('load', function () {
    var content = $(this).parents('.expandable')
    LimitExpandContent($('.js-expand-bar', content), $(content))
  })
}

function LimitExpandContent (expandBar, content) {
  var maxHeight = parseInt(expandBar.attr('data-max-height'))
  if (content.height() > maxHeight) {
    content.attr('style', 'max-height: ' + (maxHeight * 0.8) + 'px') // limit the size while preventing cropping just a single line
    expandBar.show()
    expandBar.click(function () {
      content.toggleClass('expanded')
    })
  }
}
