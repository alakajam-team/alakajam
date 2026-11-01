import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import forms from "server/core/forms";
import eventPresetService from "server/event/manage/settings/event-preset.service";
import { EventCountdownOffset } from "server/event/manage/event-manage.macros";
import { validateEventStatuses } from "server/event/manage/event-status-validation";
import { CustomRequest, CustomResponse } from "server/types";
import { AdminBaseContext } from "../admin.base";

export interface AdminEventPresetsContext extends AdminBaseContext {
  eventPresets: BookshelfModel[];
  countdownOffset: EventCountdownOffset;
  editEventPreset?: BookshelfModel;
}

/**
 * Event presets management
 */
export async function adminEventPresets(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  // Find preset to edit
  let editEventPreset: BookshelfModel;
  const editEventPresetId = req.query.edit || req.body.id;
  if (forms.isId(editEventPresetId)) {
    editEventPreset = await eventPresetService.findEventPresetById(forms.parseInt(editEventPresetId));
  } else if (req.query.create !== undefined) {
    let referencePreset = null;
    if (forms.isId(req.query.reference)) {
      referencePreset = await eventPresetService.findEventPresetById(forms.parseInt(req.query.reference.toString()));
    }
    editEventPreset = eventPresetService.initEventPreset(referencePreset);
  }

  // Apply changes
  let errorMessage: string;
  if (req.method === "POST") {
    if (req.body.delete !== undefined) {
      // Delete model
      if (editEventPreset) {
        try {
          await eventPresetService.deleteEventPreset(editEventPreset);
          editEventPreset = undefined;
        } catch (e) {
          errorMessage = e.message;
        }
      }
    } else {
      // Validation / Compute deadline offset
      const offsetFields = ["countdown-offset-d", "countdown-offset-h", "countdown-offset-m"]
        .map((field) => req.body[field] || "0");
      let offset = 0;
      if (offsetFields.every((value) => forms.isInt(value))) {
        const [days, hours, minutes] = offsetFields.map((value) => forms.parseInt(value));
        offset = ((days * 24 + hours) * 60 + minutes) * MS_PER_MINUTE;
      } else {
        errorMessage = "Invalid deadline offset from start";
      }
      errorMessage = validateEventStatuses(req.body, { allowEmpty: true }) || errorMessage;
      if (!req.body.title) {
        errorMessage = "Title is required";
      }

      // Update model (without saving yet)
      editEventPreset = editEventPreset || eventPresetService.initEventPreset();
      editEventPreset.set({
        title: forms.sanitizeString(req.body.title),
        status: forms.sanitizeString(req.body.status) || null,
        status_rules: forms.sanitizeString(req.body["status-rules"]) || null,
        status_theme: forms.sanitizeString(req.body["status-theme"]) || null,
        status_entry: forms.sanitizeString(req.body["status-entry"]) || null,
        status_results: forms.sanitizeString(req.body["status-results"]) || null,
        status_tournament: forms.sanitizeString(req.body["status-tournament"]) || null,
        countdown_config: {
          message: forms.sanitizeString(req.body["countdown-message"]),
          link: forms.sanitizeString(req.body["countdown-link"]),
          offset,
          phrase: forms.sanitizeString(req.body["countdown-phrase"]),
          enabled: req.body["countdown-enabled"] === "on",
        },
      });

      // Save if valid
      if (!errorMessage) {
        await editEventPreset.save();
        editEventPreset = null;
      }
    }
  }

  // Render page
  const eventPresetsCollection = await eventPresetService.findEventPresets();
  const context: AdminEventPresetsContext = {
    ...res.locals,
    eventPresets: eventPresetsCollection.models,
    editEventPreset,
    countdownOffset: undefined,
    errorMessage
  };
  if (editEventPreset) {
    context.countdownOffset = toCountdownOffset(editEventPreset.get("countdown_config")?.offset);
  }
  res.render<AdminEventPresetsContext>("admin/event-presets/admin-event-presets", context);
}

const MS_PER_MINUTE = 60000;

/**
 * Splits an offset in milliseconds into days, hours and minutes. Negative offsets are split towards zero.
 */
function toCountdownOffset(offsetMs = 0): EventCountdownOffset {
  const sign = offsetMs < 0 ? -1 : 1;
  const totalMinutes = Math.round(Math.abs(offsetMs) / MS_PER_MINUTE);
  return {
    d: sign * Math.floor(totalMinutes / (60 * 24)),
    h: sign * Math.floor(totalMinutes / 60) % 24,
    m: sign * (totalMinutes % 60),
  };
}
