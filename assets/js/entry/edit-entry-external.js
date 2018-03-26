/* eslint-env jquery */

module.exports = function editEntryExternal () {
  $('.js-entry-external-event').each(function () {
    const $externalEventInput = $(this)

    $externalEventInput.select2({
      ajax: {
        url: '/events/ajax-find-external-event',
        dataType: 'json',
        delay: 500,
        data: function (params) {
          return {
            name: params.term
          }
        },
        processResults: function (data, params) {
          return {
            results: data.map(function (string) {
              return { id: string, text: string }
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
            .replace('[NEW]', '<strong><i>(new event)</i></strong>')
      },
      minimumInputLength: 3,
      maximumInputLength: 255,
      allowClear: true,
      placeholder: '',
      tags: true
    })
  })
}
