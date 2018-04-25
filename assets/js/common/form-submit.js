/* eslint-env jquery */

module.exports = function formSubmit () {
  // Prevent submitting a form twice
  $('form').submit(function () {
    $('input[type=submit]', this).prop('disabled', true)
  })
}
