/* eslint-env jquery */

/**
 * Pops up a confirmation dialog if the user navigates away while unsubmitted
 * changes exist in the given forms.
 *
 * Changes are detected by the 'change' event being fired by form controls and
 * bubbling up to the form. This event is only fired if the user changes the
 * value, so if you change it programmatically, you need to call
 * .trigger('change') on the control yourself.
 */
module.exports = function warnOnUnsavedChanges (formSelector) {
  const $forms = $(formSelector)

  $forms.on('change input', function () {
    const $form = $(this).closest('form')
    if (!$form.data('beforeunloadHandler')) {
      // Create a new function each time, so that one form can't accidentally
      // unbind another's handler.
      const handler = function () {
        return 'You have unsaved changes. Do you really want to leave this page?'
      }
      $form.data('beforeunloadHandler', handler)
      $(window).on('beforeunload', handler)
    }
  })

  $forms.on('submit', function () {
    const $form = $(this)
    const handler = $form.data('beforeunloadHandler')
    if (handler) {
      $(window).off('beforeunload', handler)
      $form.data('beforeunloadHandler', null)
    }
  })
}
