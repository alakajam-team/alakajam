/* eslint-env jquery */

function sortSelect2Items (a, b) {
  if (a.text < b.text) return -1
  if (a.text > b.text) return 1
  return 0
}

function sortSelect2Results (results) {
  return results.sort(sortSelect2Items)
}

module.exports = function editEntryTeam () {
  $('.js-edit-entry-team').each(function () {
    const $editEntryTeam = $(this)
    const $searchMembers = $editEntryTeam.find('.js-search-members')

    const entryId = $editEntryTeam.attr('data-entry-id')

    const findTeamMateUrl = $editEntryTeam.attr('data-find-team-mate-url')

    function format (user, container) {
      if (user.element && $(user.element).attr('data-avatar') !== undefined) {
        const $option = $(user.element)
        user.avatar = $option.attr('data-avatar')
        user.locked = $option.attr('data-locked') === 'true'
        user.invite = $option.attr('data-invite') === 'true'
      }

      if (user.locked || $searchMembers.attr('readonly')) {
        $(container).addClass('select2-locked') /* Select2 hack to support locking tags from deletion (not supported yet in v4) */
      }
      const avatarUrl = user.avatar || '/static/images/default-avatar.png'
      // XXX this should probably use _.template
      return $([
        '<div class="member">',
        '  <div class="member-avatar">',
        '    <img class="avatar" src="', avatarUrl, '" alt="', user.text, '" />',
        '  </div>',
        '  <div class="member-info">',
        '    <div class="username">', user.text, '</div>',
        user.locked ? '<div class="tag owner-tag">Owner</div>' : '',
        user.invite ? '<div class="tag">Pending invite</div>' : '',
        '    <div class="tag unavailable-tag">Has a game already</div>',
        '  </div>',
        '</div>'].join(''))
    }

    $searchMembers.select2({
      multiple: true,
      ajax: {
        url: findTeamMateUrl,
        dataType: 'json',
        delay: 500,
        data: function (params) {
          return {
            name: params.term,
            entryId: entryId
          }
        },
        processResults: function (data, params) {
          $.each(data.matches, function (i, m) {
            m.disabled = (m.status === 'unavailable')
          })
          return {
            results: data.matches
          }
        },
        cache: true
      },
      initSelection: function (elem, cb) {
        const results = []
        $(elem).children().each(function (i, option) {
          const $option = $(option)
          results.push({
            id: $option.val(),
            text: $option.text(),
            avatar: $option.attr('data-avatar'),
            locked: $option.attr('data-locked') === 'true',
            invite: $option.attr('data-invite') === 'true'
          })
        })
        cb(results)
      },
      sortResults: sortSelect2Results,
      placeholder: '',
      width: '100%',
      allowClear: false,
      minimumInputLength: 3,
      templateResult: format,
      templateSelection: format,
      dropdownCssClass: 'edit-team-dropdown'
    })

    $searchMembers.on('select2:unselecting', function (e) {
      if ($(e.params.args.data.element).attr('data-locked') === 'true') {
        return false
      }
    })
  })
}
