/* eslint-env jquery */
/* global _ */

module.exports = function editEntryLinks () {
  $('.js-links').each(function () {
    const $links = $(this)

    const addLinkSelector = '.js-add-link'
    const removeLinkSelector = '.js-remove-link'
    const linkLabelSelector = '.js-link-label'
    const linkUrlSelector = '.js-link-url'

    const linksTemplate = _.template($('#js-links-template').html())

    const links = JSON.parse($links.attr('data-entry-links') || '[]') || []
    if (links.length === 0) {
      links.push({})
    }
    refreshLinksView()

    $links.on('click', addLinkSelector, function () {
      refreshLinksModel()
      links.push({})
      refreshLinksView()
    })

    $links.on('click', removeLinkSelector, function () {
      refreshLinksModel()
      links.splice($(this).attr('data-row'), 1)
      if (links.length === 0) {
        links.push({})
      }
      refreshLinksView()
    })

    function refreshLinksView () {
      $links.html(linksTemplate({ links: links }))
    }

    function refreshLinksModel () {
      $links.find(linkLabelSelector).each(function () {
        var $this = $(this)
        links[$this.attr('data-row')].label = $this.val()
      })
      $links.find(linkUrlSelector).each(function () {
        var $this = $(this)
        links[$this.attr('data-row')].url = $this.val()
      })
    }
  })
}
