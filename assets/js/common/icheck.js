/* eslint-env jquery */

/**
 * iCheck library init (for radio and checkbox styling).
 */
module.exports = function icheck () {
  $('input[type="radio"].js-radio, input[type="checkbox"].js-checkbox').iCheck({
    checkboxClass: 'icheckbox_flat',
    radioClass: 'iradio_flat'
  })
}
