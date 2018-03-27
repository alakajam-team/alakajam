/* eslint-env jquery */

// TODO deduplicate these select2 helpers

function sortSelect2Results (results) {
  return results.sort(sortSelect2Items)
}

function sortSelect2Items (a, b) {
  if (a.value < b.value) return -1
  if (a.value > b.value) return 1
  return 0
}

module.exports = function tagsSelect () {
  $('.js-tags-select').each(function () {
    const $select = $(this)
    const findTagsUrl = $select.attr('data-find-tags-url')
    const allowNewTags = $select.attr('data-allow-new-tags') === 'true'

    $select.select2({
      multiple: true,
      ajax: {
        url: findTagsUrl,
        dataType: 'json',
        delay: 500,
        data: function (params) {
          return {
            name: params.term
          }
        },
        processResults: function (data, params) {
          return {
            results: data.matches.map(function (userInfo) {
              return {
                id: userInfo.id,
                text: userInfo.value
              }
            })
          }
        },
        cache: true
      },
      createTag: function (tag) {
        if (tag.term.indexOf('[NEW]') === -1) {
          return {
            id: tag.term,
            text: tag.term + ' [NEW]'
          }
        } else {
          return null
        }
      },
      escapeMarkup: function (m) {
        return jQuery.fn.select2.defaults.defaults.escapeMarkup(m)
            .replace('[NEW]', '<strong><i>(new tag)</i></strong>')
      },
      tags: allowNewTags,
      sortResults: sortSelect2Results,
      width: '100%',
      allowClear: false,
      minimumInputLength: 3
    })
  })
}
