
const watchedForms = [];

/**
 * Pops up a confirmation dialog if the user navigates away while unsubmitted
 * changes exist in the given forms.
 *
 * This works by serializing the initial form values at the moment it is
 * called. At the moment the user navigates away, it compares the current
 * serialized values to the stored ones. If they differ, a warning is thrown
 * up.
 */
export default function warnOnUnsavedChanges(formSelector) {
  const $forms = $(formSelector);

  // Wait a bit before storing initial values, because other scripts might come
  // between (often at DOM ready) and change the form.
  window.setTimeout(() => {
    $forms.each(function() {
      const $form = $(this);

      storeInitialValues(this);
      $form.on("submit", function() { storeInitialValues(this); });

      watchedForms.push(this);
    });
  }, 100);
}

function getInitialValues(form) {
  return $(form).data("initialValues");
}

function storeInitialValues(form) {
  const $form = $(form);
  $form.data("initialValues", $form.serialize());
}

function containsInitialValues(form) {
  const $form = $(form);
  const initialValues = getInitialValues(form);
  return $form.serialize() === initialValues;
}

// Make sure to attach this only once, and not, say, once per form. Otherwise
// we might get multiple consecutive popups.
$(window).on("beforeunload", function onBeforeUnload() {
  if (!watchedForms.every(containsInitialValues)) {
    return "You have unsaved changes. Do you really want to leave this page?";
  }
});
