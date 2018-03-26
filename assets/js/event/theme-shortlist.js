/* eslint-env jquery */

const Sortable = require('../../../node_modules/sortablejs/Sortable')

module.exports = function themeShortlist () {
  const $shortlist = $('#js-shortlist')
  if ($shortlist.length === 0) {
    return
  }
  const $shortlistVotes = $('#js-shortlist-votes')
  const $shortlistSubmit = $('#js-shortlist-submit')

  Sortable.create($shortlist[0], {
    animation: 100,
    onUpdate: function () {
      const votes = []
      $shortlist.find('li').each(function () {
        votes.push($(this).attr('data-theme-id'))
      })
      $shortlistVotes.val(votes)
      $shortlistSubmit
        .removeClass('disabled')
        .removeAttr('disabled')
    },
    onStart: function () {
      this.el.classList.remove('use-hover')
    },
    onEnd: function () {
      this.el.classList.add('use-hover')
    }
  })
}
