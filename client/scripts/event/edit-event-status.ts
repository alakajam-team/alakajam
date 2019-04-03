
const advancedModeToggleInputs = "#js-edit-event-status-toggles input";
const advancedModeBlock = "#js-state-advanced";
const eventPresetSelect = "#js-edit-event-status-preset";
const eventStartInput = "input[name=started-at]";
const errorOutput = "#js-edit-event-status-error";

/**
 *  Hide non-tournament status if tournament is not disabled
 */
function refreshNonTournamentToggle(statusTournamentValue) {
  const showOtherStatus = !statusTournamentValue || statusTournamentValue === "disabled";
  $("#js-edit-event-status-jam").toggle(showOtherStatus);
}

/**
 * Hide all toggles unless advanced mode is enabled
 */
function refreshAdvancedModeToggle() {
  $(advancedModeToggleInputs).each(function() {
    const $this = $(this);
    if ($this.hasClass("active")) {
      if ($this.val() === "Hide") {
        $(advancedModeBlock).hide();
      } else {
        $(advancedModeBlock).show();
      }
    }
  });
}

function clearPreset() {
  $(eventPresetSelect).val(null).trigger("change");
}

function applyInputValue(inputName, value) {
  if (value) {
    $(advancedModeBlock + " [name=" + inputName + "]").val(value);
  }
}

function applyRadioValue(inputName, value) {
  if (value) {
    const $radio = $(advancedModeBlock + " input[name=" + inputName + "][value=" + value + "]");
    if ($radio.iCheck) {
      $radio.iCheck("check");
    } else {
      $radio.click();
    }
  }
}

function setError(value) {
  const $errorOutput = $(errorOutput);
  $errorOutput.html(value);
  if (value) {
    $errorOutput.show();
  } else {
    $errorOutput.hide();
  }
}

function applyPreset() {
  setError("");

  const presetValue = $(eventPresetSelect).val();
  if (presetValue) {
    const $valueOption = $(eventPresetSelect + ' option[value="' + presetValue + '"]');
    const presetAttributes = $valueOption.data("attributes");

    applyInputValue("countdown-message", presetAttributes.countdown_config.message);
    applyInputValue("countdown-link", presetAttributes.countdown_config.link);
    applyInputValue("countdown-phrase", presetAttributes.countdown_config.phrase);

    // Countdown date = event start date + preset offset in minutes
    const startedAtPickerData = $(eventStartInput).data("datetimepicker");
    const startedAtDate = startedAtPickerData.getDate();
    let targetDate;
    if (startedAtPickerData.element.val() && startedAtDate) {
      targetDate = new Date(startedAtDate.getTime() + parseInt(presetAttributes.countdown_config.offset, 10));
    } else {
      setError("Please first set the event Start Date, or deadlines will be wrong! (under the Appearance tab)");
      return;
    }
    $(advancedModeBlock + " [name=countdown-date]")
      .data("datetimepicker")
      .setDate(targetDate);

    applyRadioValue("status", presetAttributes.status);
    applyRadioValue("status-rules", presetAttributes.status_rules);
    applyRadioValue("status-theme", presetAttributes.status_theme);
    applyRadioValue("status-entry", presetAttributes.status_entry);
    applyRadioValue("status-results", presetAttributes.status_results);
    applyRadioValue("status-tournament", presetAttributes.status_tournament);
  }
}

export default function editEventStatus() {
  // Non-tournament status
  $("input[type=radio][name=status-tournament]").on("change, ifChecked", function() {
    refreshNonTournamentToggle($(this).val());
  });
  refreshNonTournamentToggle($("input[type=radio][name=status-tournament]:checked").val());

  // Advanced mode
  refreshAdvancedModeToggle();
  $(advancedModeToggleInputs).click(function() {
    $(advancedModeToggleInputs).removeClass("active");
    $(this).addClass("active");
    refreshAdvancedModeToggle();
  });

  // Apply preset changes
  $(eventPresetSelect).on("change", applyPreset);
  if (window.location.search.includes("event-template-id=")) {
    applyPreset();
  }
  $(eventStartInput).on("change", applyPreset);

  // Clear preset on advanced changes
  const $allAdvancedInputs = $(advancedModeBlock + " input");
  $allAdvancedInputs.change(clearPreset);
  $allAdvancedInputs.on("ifChanged", clearPreset);
}
