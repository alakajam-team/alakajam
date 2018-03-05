/* eslint-env jquery */

module.exports = function datePicker (selector) {
  $(selector).each(function (i, element) {
    let $element = $(element)
    $element.datetimepicker({
      format: $element.attr('data-format'), // XXX lib should have picked the attribute itself
      autoClose: true,
      todayBtn: true,
      pickerPosition: 'top-left',
      zIndex: 1050
    })
  })
  $.fn.datetimepicker.dates['en'].today = 'Now'
}
