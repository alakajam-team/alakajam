/* eslint-env jquery */

function getRadio (textField) {
  return $('#' + $(textField).attr('data-target'))
}

function refreshRadio (textField) {
  const $textField = $(textField)
  const $radio = getRadio(textField)
  $radio.val($textField.val())
}

function refreshTextField (textField) {
  const $textField = $(textField)
  const $radio = getRadio(textField)
  if ($radio.get(0).checked) {
    $textField.val($radio.val())
    $textField.removeAttr('disabled')
  } else {
    $textField.val('')
    $textField.attr('disabled', 'disabled')
  }
}

/**
 * Radio <-> Text field bindings
 */
module.exports = function radioTextField () {
  const $textFields = $('.js-radio-text-field')

  // Initialize text field with value if enabled
  $textFields.each(function () {
    const textField = this
    refreshTextField(textField)
    getRadio(textField).on('ifChanged', function () {
      refreshTextField(textField)
    })
  })

  // Update radio upon text field change
  $textFields.change(function () {
    refreshRadio(this)
  })
}
