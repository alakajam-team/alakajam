/* eslint-env jquery */
/* global _ */

const Sortable = require('../../../node_modules/sortablejs/Sortable')

module.exports = function editEntryLinks () {
  const linksTemplate = _.template($('#js-links-template').html())
  const addLinkSelector = '.js-add-link'
  const removeLinkSelector = '.js-remove-link'
  const linkLabelSelector = '.js-link-label'
  const linkUrlSelector = '.js-link-url'

  let $linksContainer = $('.js-links')

  const links = JSON.parse($linksContainer.attr('data-entry-links') || '[]') || []
  if (links.length === 0) {
    links.push({})
  }

  if ($linksContainer.length > 0) {
    Sortable.create($linksContainer[0], {
      animation: 100,
      handle: '.draggable',
      onEnd: function () {
        let index = 0
        $('.js-link').each(function () {
          $('.js-link-label', this).attr({
            'name': 'label' + index,
            'data-row': index
          })
          $('.js-link-url', this).attr({
            'name': 'url' + index,
            'data-row': index
          })
          $('.js-remove-link', this).attr({
            'data-row': index
          })
          index++
        })
      }
    })

    refreshLinksView()

    $linksContainer.on('click', addLinkSelector, function () {
      refreshLinksModel()
      links.push({})
      refreshLinksView()
    })

    $linksContainer.on('click', removeLinkSelector, function () {
      refreshLinksModel()
      links.splice($(this).attr('data-row'), 1)
      if (links.length === 0) {
        links.push({})
      }
      refreshLinksView()
    })
  }

  function refreshLinksView () {
    $linksContainer.html(linksTemplate({ links: links }))
  }

  function refreshLinksModel () {
    $linksContainer.find(linkLabelSelector).each(function () {
      var $this = $(this)
      links[$this.attr('data-row')].label = $this.val()
    })
    $linksContainer.find(linkUrlSelector).each(function () {
      var $this = $(this)
      links[$this.attr('data-row')].url = $this.val()
    })
  }
}
