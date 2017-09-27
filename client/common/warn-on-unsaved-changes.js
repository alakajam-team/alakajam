/* eslint-env jquery */

/**
 * Pops up a confirmation dialog if the user navigates away while unsubmitted
 * changes exist in the given form.
 *
 * Changes are detected by the 'change' event being fired by form controls and
 * bubbling up to the form. This event is only fired if the user changes the
 * value, so if you change it programmatically, you need to call
 * .trigger('change') on the control yourself.
 */
module.exports = function warnOnUnsavedChanges (formSelector, message) {
  const $form = $(formSelector)
  message = message || 'You have unsaved changes. Do you really want to leave this page?'
  let unsavedChanges = false

  function confirmNavigation () {
    return message
  }

  function setUnsavedChanges (value) {
    if (unsavedChanges === value) {
      return
    }
    unsavedChanges = value
    if (unsavedChanges) {
      $(window).on('beforeunload', confirmNavigation)
    } else {
      $(window).off('beforeunload', confirmNavigation)
    }
  }

  $form.on('change input', function () {
    setUnsavedChanges(true)
  })
  $form.on('submit', function () {
    setUnsavedChanges(false)
  })
}
