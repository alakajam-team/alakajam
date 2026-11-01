import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import constants from "server/core/constants";
import forms from "server/core/forms";
import eventPresetService from "server/event/manage/settings/event-preset.service";
import eventTemplateService from "server/event/manage/create/event-template.service";
import { CustomRequest, CustomResponse } from "server/types";
import { AdminBaseContext } from "../admin.base";

export interface AdminEventContext extends AdminBaseContext {
  eventTemplates: BookshelfModel[];
  eventPresets: BookshelfModel[];
  editEventTemplate: BookshelfModel;
}

/**
 * Event templates management
 */
export async function adminEventTemplates(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  // Find template to edit
  let editEventTemplate: BookshelfModel;
  const editEventTemplateId = req.query.edit || req.body.id;
  if (forms.isId(editEventTemplateId)) {
    editEventTemplate = await eventTemplateService.findEventTemplateById(forms.parseInt(editEventTemplateId));
  } else if (req.query.create !== undefined) {
    editEventTemplate = eventTemplateService.initEventTemplate();
  }

  // Apply changes
  let errorMessage: string;
  if (req.method === "POST") {
    if (req.body.delete !== undefined) {
      // Delete model
      if (editEventTemplate) {
        await eventTemplateService.deleteEventTemplate(editEventTemplate);
        editEventTemplate = undefined;
      }
    } else {
      // Update model (without saving yet)
      const links = parseJsonField(req.body.links, []);
      const divisions = parseJsonField(req.body.divisions, {});
      const categoryTitles = parseJsonField(req.body["category-titles"], []);
      const eventPresetId = req.body["event-preset-id"] || null;
      editEventTemplate = editEventTemplate || eventTemplateService.initEventTemplate();
      editEventTemplate.set({
        title: forms.sanitizeString(req.body.title),
        event_title: forms.sanitizeString(req.body["event-title"]),
        event_preset_id: eventPresetId,
        // Invalid JSON is kept as-is so that the user can fix it
        links: links === false ? req.body.links : links,
        divisions: divisions === false ? req.body.divisions : divisions,
        category_titles: categoryTitles === false ? req.body["category-titles"] : categoryTitles,
      });

      // Validation
      if (!editEventTemplate.get("title")) {
        errorMessage = "Title is required";
      } else if (eventPresetId && !(await eventPresetService.isValidEventPresetId(eventPresetId))) {
        errorMessage = "Invalid event preset";
      } else if (links === false) {
        errorMessage = "Invalid home page shortcuts JSON";
      } else if (divisions === false) {
        errorMessage = "Invalid divisions JSON";
      } else if (categoryTitles === false) {
        errorMessage = "Invalid rating categories JSON";
      } else if (Array.isArray(categoryTitles) && categoryTitles.length > constants.MAX_CATEGORY_COUNT) {
        errorMessage = "Events cannot have more than " + constants.MAX_CATEGORY_COUNT + " rating categories";
      }

      // Save if valid
      if (!errorMessage) {
        await editEventTemplate.save();
        editEventTemplate = undefined;
      }
    }
  }

  // Render page
  const eventPresetsCollection = await eventPresetService.findEventPresets();
  const eventTemplatesCollection = await eventTemplateService.findEventTemplates();
  res.render<AdminEventContext>("admin/event-templates/admin-event-templates", {
    eventPresets: eventPresetsCollection.models,
    eventTemplates: eventTemplatesCollection.models,
    editEventTemplate,
    errorMessage,
    ...res.locals
  });
}

/**
 * Parses a JSON form field, like the event settings form does: empty fields are allowed.
 * @returns The parsed value, or false if the JSON is invalid
 */
function parseJsonField<T>(value: string, emptyValue: T): T | false {
  if (!value || !value.trim()) {
    return emptyValue;
  }
  return forms.parseJson<T>(value) as T | false;
}
