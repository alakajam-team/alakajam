
/**
 * Utilities made available in all templates
 *
 * @module controllers/templating
 */

import * as url from "url";
import config from "./config";
import forms from "./forms";
import security from "./security";

const DASHBOARD_PAGES = ["feed", "entries", "posts", "scores", "invite", "settings", "password", "entry-import"];
const ALTERNATE_STATIC_ROOT_URL = url.resolve(config.ROOT_URL, "static/");

export default {
  buildUrl,

  pictureUrl,
  staticUrl,

  min: Math.min,
  max: Math.max,

  isId: forms.isId,

  isPast,
  wasEdited,

  isUserWatching: security.isUserWatching,
  canUserRead: security.canUserRead,
  canUserWrite: security.canUserWrite,
  canUserManage: security.canUserManage,
  isAdmin: security.isAdmin,
  isMod: security.isMod
};

/**
 * Indicates if a date is already past
 * @param  {number}  time
 * @return {Boolean}
 */
export function isPast(time) {
  return time && (new Date().getTime() - time) > 0;
}

/**
 * Tells whether a model has been edited > 1 hour after its creation
 * @param  {Model} model Any model with timestamps
 * @return {bool}
 */
export function wasEdited(model) {
  return model.get("updated_at") - model.get("created_at") > 3600 * 1000;
}

export function buildUrl(model, type, page = null, options: any = {}) {
  try {
    let pagePath = (page ? "/" + page : "");

    if (type === "event") {
      // Event model
      if (model && model.id) {
        return "/" + model.get("name") + pagePath;
      } else if (page === "ajax-find-team-mate") {
        return "/external-entry/ajax-find-team-mate";
      } else if (page === "template") {
        return "/pick_event_template";
      } else {
        return "/create_event";
      }
    } else if (type === "entry") {
      // Entry model
      const array = ["", model.get("event_name") || "external-entry"];
      if (model.id) {
        array.push(model.get("id"), model.get("name"), page);
      } else {
        array.push(page || "create-entry");
      }
      return array.join("/").replace("//", "/");
    } else if (type === "user") {
      // User Role model / User model
      if (DASHBOARD_PAGES.indexOf(page) !== -1) {
        if (options.dashboardAdminMode) {
          page += "?user=" + model.get("name") + (options.query ? "&" + options.query : "");
        } else if (options.query) {
          page += "?" + options.query;
        }
        const fullPath = "/dashboard/" + page;
        if (model) {
          return fullPath;
        } else {
          return "/login?redirect=" + encodeURIComponent(fullPath);
        }
      } else {
        const userName = model.get("name") || model.get("user_name");
        return "/user/" + userName + pagePath;
      }
    } else if (type === "post") {
      // Post model
      if (page === "create") {
        pagePath += "?";
        if (options.eventId) { pagePath += "eventId=" + options.eventId; }
        if (options.entryId) { pagePath += "&entryId=" + options.entryId; }
        if (options.specialPostType) { pagePath += "&special_post_type=" + options.specialPostType; }
        if (options.title) { pagePath += "&title=" + options.title; }
        return "/post" + pagePath;
      } else if (model && typeof model === "object") {
        return "/post/" + model.id + "/" + (model.get("name") || "untitled") + pagePath;
      } else {
        return "/post/" + model;
      }
    } else if (type === "comment") {
      // Comment model
      let pageParams = "";
      if (model && page === "edit") {
        pageParams = "editComment=" + model.id;
      }
      return "?" + pageParams + (model ? "#c" + model.id : "");
    } else if (type === "tags") {
      return "/tags/" + page;
    }
  } catch (e) {
    throw new Error('Failed to build URL for model "' + model + '" of type "' + type + '": ' + e.message);
  }
}

function pictureUrl(picturePath, model) {
  const rawUpdatedAt = model.get("updated_at");
  const timestamp = (typeof rawUpdatedAt === "object")
    ? rawUpdatedAt.getTime() : rawUpdatedAt; // SQlite/PostgreSQL inconsistency
  return staticUrl(picturePath + "?" + timestamp);
}

function staticUrl(path) {
  const rootUrl = config.STATIC_ROOT_URL || ALTERNATE_STATIC_ROOT_URL;
  return url.resolve(rootUrl, path);
}
