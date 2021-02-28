import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
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
    editEventTemplate = await eventTemplateService.findEventTemplateById(parseInt(editEventTemplateId, 10));
  } else if (req.query.create !== undefined) {
    editEventTemplate = eventTemplateService.initEventTemplate();
  }

  // Apply changes
  let errorMessage: string;
  if (req.method === "POST") {
    if (req.body.delete !== undefined) {
      // Delete model
      await eventTemplateService.deleteEventTemplate(editEventTemplate);
      editEventTemplate = undefined;
    } else {
      // Update model (without saving yet)
      editEventTemplate = editEventTemplate || eventTemplateService.initEventTemplate();
      editEventTemplate.set({
        title: forms.sanitizeString(req.body.title),
        event_title: forms.sanitizeString(req.body["event-title"]),
        event_preset_id: req.body["event-preset-id"] || null,
        links: forms.parseJson(req.body.links, { acceptInvalid: true }),
        divisions: forms.parseJson(req.body.divisions, { acceptInvalid: true }),
        category_titles: forms.parseJson(req.body["category-titles"], { acceptInvalid: true }),
      });

      // Validation
      if (!editEventTemplate.get("title")) {
        errorMessage = "Title is required";
      } else if (forms.parseJson(req.body.links) === false) {
        errorMessage = "Invalid home page shortcuts JSON";
      } else if (forms.parseJson(req.body.divisions) === false) {
        errorMessage = "Invalid divisions JSON";
      } else if (forms.parseJson(req.body["category-titles"]) === false) {
        errorMessage = "Invalid rating categories JSON";
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
