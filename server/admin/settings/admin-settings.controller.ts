import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import forms from "server/core/forms";
import log from "server/core/log";
import security from "server/core/security";
import settings from "server/core/settings";
import { EditableSetting, EDITABLE_SETTINGS } from "server/core/settings-keys";
import { CustomRequest, CustomResponse } from "server/types";
import { AdminBaseContext } from "../admin.base";

export type EditableSettingInstance = EditableSetting & { value: string };

export interface AdminSettingsContext extends AdminBaseContext {
  settings: EditableSettingInstance[];
  editSetting: EditableSettingInstance;
}

/**
 * Settings management
 */
export async function adminSettings(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  const { user } = res.locals;

  if (!config.DEBUG_ADMIN && !security.isMod(user)) {
    res.errorPage(403);
  }

  // Save changed setting
  let currentEditValue: string | undefined;
  if (req.method === "POST") {
    const editableSetting = EDITABLE_SETTINGS.find((setting) => setting.key === req.body.key);
    if (editableSetting && settings.canUserEdit(user, editableSetting)) {
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
  const editableSettings: Array<EditableSettingInstance> = [];
  for (const editableSetting of EDITABLE_SETTINGS) {
    if (settings.canUserEdit(user, editableSetting)) {
      const editableSettingWithValue = {
        ...editableSetting,
        value: await settings.find(editableSetting.key),
      };
      editableSettings.push(editableSettingWithValue);
      if (!currentEditValue && req.query.edit && editableSetting.key === req.query.edit) {
        currentEditValue = editableSettingWithValue.value;
      }
    }
  }

  // Fetch setting to edit (and make JSON pretty)
  let editSetting: EditableSettingInstance | undefined;
  if (req.query.edit) {
    const editableSetting = EDITABLE_SETTINGS.find((setting) => setting.key === req.query.edit);
    if (editableSetting?.isJson && settings.canUserEdit(user, editableSetting)) {
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

  res.render<AdminSettingsContext>("admin/settings/admin-settings", {
    ...res.locals,
    settings: editableSettings,
    editSetting
  });
}
