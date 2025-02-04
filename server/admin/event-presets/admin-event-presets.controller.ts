import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import forms from "server/core/forms";
import eventPresetService from "server/event/manage/settings/event-preset.service";
import { EventCountdownOffset } from "server/event/manage/event-manage.macros";
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
  // Find template to edit
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
      await eventPresetService.deleteEventPreset(editEventPreset);
      editEventPreset = undefined;
    } else {
      // Validation / Compute deadline offset
      // TODO Status radios validation (to be put in common with the event edition form)
      let offset = 0;
      try {
        const offsetMinutes = parseInt(req.body["countdown-offset-d"], 10) * 60 * 24 +
          parseInt(req.body["countdown-offset-h"], 10) * 60 +
          parseInt(req.body["countdown-offset-m"], 10);
        offset = offsetMinutes * 60000;
      } catch {
        errorMessage = "Invalid deadline offset from start";
      }
      if (!req.body.title) {
        errorMessage = "Title is required";
      }

      // Update model (without saving yet)
      editEventPreset = editEventPreset || eventPresetService.initEventPreset();
      editEventPreset.set({
        title: forms.sanitizeString(req.body.title),
        status: forms.sanitizeString(req.body.status),
        status_rules: forms.sanitizeString(req.body["status-rules"]),
        status_theme: forms.sanitizeString(req.body["status-theme"]),
        status_entry: forms.sanitizeString(req.body["status-entry"]),
        status_results: forms.sanitizeString(req.body["status-results"]),
        status_tournament: forms.sanitizeString(req.body["status-tournament"]),
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
    countdownOffset: undefined
  };
  if (editEventPreset) {
    const rawOffset = 1.0 * (editEventPreset.get("countdown_config").offset || 0);
    const minutesPerDay = 60.0 * 24.0;
    const days = Math.floor(rawOffset / minutesPerDay);
    const rawOffsetWithoutDays = rawOffset - days * minutesPerDay;
    context.countdownOffset = {
      d: days,
      h: Math.floor(rawOffsetWithoutDays / 60),
      m: rawOffsetWithoutDays % 60,
    };
  }
  res.render<AdminEventPresetsContext>("admin/event-presets/admin-event-presets", {
    ...res.locals,
    ...context
  });
}
