/* eslint-env jquery */

module.exports = function userSelect () {
  $('.js-user-select').each(function () {
    var $select = $(this)
    $select.select2({
      ajax: {
        url: '/api/user',
        dataType: 'json',
        delay: 500,
        data: function (params, page) {
          return {
            title: params.term,
            page: (page - 1)
          }
        },
        processResults: function (data, params) {
          return {
            results: data.users.map(function (userInfo) {
              return {
                id: userInfo.id,
                text: userInfo.title
              }
            })
          }
        },
        cache: true
      },
      width: '100%',
      allowClear: true,
      placeholder: '',
      minimumInputLength: 3
    })
  })
}
