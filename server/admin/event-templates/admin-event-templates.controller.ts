import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import forms from "server/core/forms";
import eventPresetService from "server/event/event-preset.service";
import eventTemplateService from "server/event/event-template.service";
import { CustomRequest, CustomResponse } from "server/types";
import { adminEventTemplatesTemplate } from "./admin-event-templates.template";

/**
 * Event templates management
 */
export async function adminEventTemplates(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  // Find template to edit
  let editEventTemplate: BookshelfModel | null = null;
  const editEventTemplateId = req.query.edit || req.body.id;
  if (forms.isId(editEventTemplateId)) {
    editEventTemplate = await eventTemplateService.findEventTemplateById(parseInt(editEventTemplateId, 10));
  } else if (req.query.create !== undefined) {
    editEventTemplate = eventTemplateService.createEventTemplate();
  }

  // Apply changes
  let errorMessage: string | null = null;
  if (req.method === "POST") {
    if (req.body.delete !== undefined) {
      // Delete model
      await eventTemplateService.deleteEventTemplate(editEventTemplate);
      editEventTemplate = null;
    } else {
      // Update model (without saving yet)
      editEventTemplate = editEventTemplate || eventTemplateService.createEventTemplate();
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
        editEventTemplate = null;
      }
    }
  }

  // Render page
  const eventPresetsCollection = await eventPresetService.findEventPresets();
  const eventTemplatesCollection = await eventTemplateService.findEventTemplates();
  res.renderJSX(adminEventTemplatesTemplate, {
    eventPresets: eventPresetsCollection.models,
    eventTemplates: eventTemplatesCollection.models,
    editEventTemplate,
    errorMessage,
    ...res.locals
  });
}
