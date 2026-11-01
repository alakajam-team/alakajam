import enums from "server/core/enums";
import forms from "server/core/forms";

/**
 * Validates the event status fields, as submitted by the `stateForm` macro.
 * @param options.allowEmpty Accept missing statuses, eg. for presets that leave them unchanged
 * @returns An error message, or undefined if the statuses are valid
 */
export function validateEventStatuses(body: Record<string, any>, options: { allowEmpty?: boolean } = {}): string | undefined {
  const isValid = (field: string, values: Record<string, string>, acceptPostId = false) =>
    (options.allowEmpty && !body[field]) || forms.isIn(body[field], values) || (acceptPostId && forms.isId(body[field]));

  if (!isValid("status", enums.EVENT.STATUS)) {
    return "Invalid status";
  } else if (!isValid("status-theme", enums.EVENT.STATUS_THEME, true)) {
    return "Invalid theme status";
  } else if (!isValid("status-entry", enums.EVENT.STATUS_ENTRY)) {
    return "Invalid entry status";
  } else if (!isValid("status-results", enums.EVENT.STATUS_RESULTS, true)) {
    return "Invalid results status";
  } else if (!isValid("status-tournament", enums.EVENT.STATUS_TOURNAMENT)) {
    return "Invalid tournament status";
  }
}
