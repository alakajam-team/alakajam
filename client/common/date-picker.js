/* eslint-env jquery */

module.exports = function datePicker (selector) {
  $(selector).datetimepicker({
    format: 'yyyy-mm-dd hh:ii',
    autoClose: true,
    todayBtn: true,
    pickerPosition: 'top-left'
  })
  $.fn.datetimepicker.dates['en'].today = 'Now'
}
