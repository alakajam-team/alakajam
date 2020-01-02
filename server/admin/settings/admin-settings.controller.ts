import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import forms from "server/core/forms";
import log from "server/core/log";
import security from "server/core/security";
import settings from "server/core/settings";
import { EDITABLE_SETTINGS, EditableSetting } from "server/core/settings-keys";
import { CustomRequest, CustomResponse } from "server/types";

/**
 * Admin only: settings management
 */
export async function adminSettings(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  if (!config.DEBUG_ADMIN && !security.isAdmin(res.locals.user)) {
    res.errorPage(403);
  }

  // Save changed setting
  let currentEditValue: string | undefined;
  if (req.method === "POST") {
    const editableSetting = EDITABLE_SETTINGS.find((setting) => setting.key === req.body.key);
    if (editableSetting) {
      let save = true;
      if (editableSetting.isJson) {
        try {
          // Minimize JSON
          req.body.value = JSON.stringify(JSON.parse(req.body.value));
        } catch (e) {
          // We re-send the user to the edit page with an error message
          save = false;
          req.query.edit = req.body.key;
          currentEditValue = req.body.value;
          res.locals.errorMessage = "This setting field needs to be a valid JSON field";
        }
      }
      if (save) {
        currentEditValue = forms.sanitizeString(req.body.value, { maxLength: 10000 });
        await settings.save(req.body.key, currentEditValue);
      }
    } else {
      res.errorPage(403, "Tried to edit a non-editable setting");
      return;
    }
  }

  // Gather editable settings
  const editableSettings: Array<EditableSetting & { value: string }> = [];
  for (const editableSetting of EDITABLE_SETTINGS) {
    const editableSettingWithValue = {
      ...editableSetting,
      value: await settings.find(editableSetting.key),
    };
    editableSettings.push(editableSettingWithValue);
    if (!currentEditValue && req.query.edit && editableSetting.key === req.query.edit) {
      currentEditValue = editableSettingWithValue.value;
    }
  }

  // Fetch setting to edit (and make JSON pretty)
  let editSetting: EditableSetting & { value: string } | undefined;
  if (req.query.edit && forms.isSlug(req.query.edit)) {
    const editableSetting = EDITABLE_SETTINGS.find((setting) => setting.key === req.query.edit);
    if (editableSetting?.isJson) {
      try {
        currentEditValue = JSON.stringify(JSON.parse(currentEditValue), null, 4);
      } catch (e) {
        log.error("Field " + req.query.edit + " is not a valid JSON");
      }
    }

    editSetting = {
      ...editableSetting,
      value: currentEditValue
    };
  }

  res.render("admin/settings/admin-settings", {
    settings: editableSettings,
    editSetting,
  });
}
