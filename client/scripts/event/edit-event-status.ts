
const advancedModeToggleInputs = "#js-edit-event-status-toggles input";
const advancedModeBlock = "#js-state-advanced";
const eventPresetSelect = "#js-edit-event-status-preset";
const eventStartInput = "input[name=started-at]";
const eventStartPicker = "#datetimepicker-started-at";
const errorOutput = "#js-edit-event-status-error";

/**
 * Set while a preset is being applied, so that the resulting input changes don't clear the preset
 */
let applyingPreset = false;

export default function editEventStatus(): void {
  if (!$(eventPresetSelect).length) {
    return;
  }

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
  $(eventStartPicker).on("change.datetimepicker", applyPreset);

  // Clear preset on advanced changes
  const $allAdvancedInputs = $(advancedModeBlock + " input");
  $allAdvancedInputs.on("change", clearPreset);
  $allAdvancedInputs.on("ifChanged", clearPreset);
}

/**
 * Hide all toggles unless advanced mode is enabled
 */
function refreshAdvancedModeToggle() {
  $(advancedModeToggleInputs).each(function() {
    const $this = $(this);
    if ($this.hasClass("active")) {
      $(advancedModeBlock).toggleClass("d-none", $this.val() === "Hide");
    }
  });
}

function applyPreset() {
  const presetValue = $(eventPresetSelect).val();
  if (!presetValue || applyingPreset) {
    return;
  }

  applyingPreset = true;
  try {
    setError("");
    const $valueOption = $(eventPresetSelect + ' option[value="' + presetValue + '"]');
    const presetAttributes = $valueOption.data("attributes");
    const countdownConfig = presetAttributes.countdown_config || {};

    applyInputValue("countdown-message", countdownConfig.message);
    applyInputValue("countdown-link", countdownConfig.link);
    applyInputValue("countdown-phrase", countdownConfig.phrase);
    applyCheckboxValue("countdown-enabled", countdownConfig.enabled);

    applyRadioValue("status", presetAttributes.status);
    applyRadioValue("status-rules", presetAttributes.status_rules);
    applyRadioValue("status-theme", presetAttributes.status_theme);
    applyRadioValue("status-entry", presetAttributes.status_entry);
    applyRadioValue("status-results", presetAttributes.status_results);
    applyRadioValue("status-tournament", presetAttributes.status_tournament);

    // Countdown date = event start date + preset offset in milliseconds
    const startedAt = parseUTCDate($(eventStartInput).val() as string);
    if (startedAt) {
      const targetDate = new Date(startedAt.getTime() + (parseInt(countdownConfig.offset, 10) || 0));
      applyInputValue("countdown-date", formatUTCDateTime(targetDate));
    } else {
      setError("Please first set the event Start Date, or deadlines will be wrong! (under the Appearance tab)");
    }
  } finally {
    applyingPreset = false;
  }
}

function clearPreset() {
  if (!applyingPreset) {
    $(eventPresetSelect).val(null).trigger("change");
  }
}

function applyInputValue(inputName: string, value: string) {
  if (value !== undefined && value !== null) {
    $(advancedModeBlock + " [name=" + inputName + "]").val(value);
  }
}

function applyCheckboxValue(inputName: string, value: boolean) {
  const $checkbox = $(advancedModeBlock + " input[name=" + inputName + "]");
  if ($checkbox.iCheck) {
    $checkbox.iCheck(value ? "check" : "uncheck");
  } else {
    $checkbox.prop("checked", Boolean(value));
  }
}

/**
 * Checks the radio matching the value, or fills the radio text field (eg. post IDs) if there is none.
 * Radios are looked up in the whole form, as some of them (eg. rules) live outside the advanced block.
 */
function applyRadioValue(inputName: string, value: string) {
  if (!value) {
    return;
  }

  const $form = $(eventPresetSelect).closest("form");
  const $radios = $form.find("input[type=radio][name=" + inputName + "]");
  let $radio = $radios.filter(function() { return $(this).val() === value; });
  let $textField: JQuery = $();
  if (!$radio.length) {
    $textField = $form.find(".js-radio-text-field").filter(function() {
      return $radios.is("#" + $(this).attr("data-target"));
    });
    $radio = $("#" + $textField.attr("data-target"));
  }

  if ($radio.iCheck) {
    $radio.iCheck("check");
  } else {
    $radio.prop("checked", true).trigger("change");
  }
  if ($textField.length) {
    $textField.removeAttr("disabled").val(value).trigger("change");
  }
}

function setError(value: string) {
  $(errorOutput).html(value).toggleClass("d-none", !value);
}

function parseUTCDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  if (match) {
    return new Date(Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10)));
  }
}

/**
 * Formats a date like the countdown date picker, which is in UTC: "YYYY-MM-DD HH:mm"
 */
function formatUTCDateTime(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ");
}
