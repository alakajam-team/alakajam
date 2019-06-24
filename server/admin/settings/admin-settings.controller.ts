import config from "server/core/config";
import constants from "server/core/constants";
import forms from "server/core/forms";
import log from "server/core/log";
import security from "server/core/security";
import settings from "server/core/settings";

/**
 * Admin only: settings management
 */
export async function adminSettings(req, res) {
  if (!config.DEBUG_ADMIN && !security.isAdmin(res.locals.user)) {
    res.errorPage(403);
  }

  // Save changed setting
  let currentEditValue;
  if (req.method === "POST") {
    if (constants.EDITABLE_SETTINGS.indexOf(req.body.key) !== -1) {
      let save = true;
      if (constants.JSON_EDIT_SETTINGS.indexOf(req.body.key) !== -1) {
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
  const editableSettings = [];
  for (const key of constants.EDITABLE_SETTINGS) {
    const editableSetting = {
      key,
      value: await settings.find(key),
    };
    editableSettings.push(editableSetting);
    if (!currentEditValue && req.query.edit && key === req.query.edit) {
      currentEditValue = editableSetting.value;
    }
  }

  // Fetch setting to edit (and make JSON pretty)
  let editSetting;
  if (req.query.edit && forms.isSlug(req.query.edit)) {
    const jsonSetting = constants.JSON_EDIT_SETTINGS.indexOf(req.query.edit) !== -1;
    if (jsonSetting) {
      try {
        currentEditValue = JSON.stringify(JSON.parse(currentEditValue), null, 4);
      } catch (e) {
        log.error("Field " + req.query.edit + " is not a valid JSON");
      }
    }

    editSetting = {
      key: req.query.edit,
      value: currentEditValue,
      jsonSetting,
    };
  }

  res.render("admin/settings/admin-settings", {
    settings: editableSettings,
    editSetting,
  });
}
