import { BookshelfModel } from "bookshelf";
import * as url from "url";
import config from "./config";

const DASHBOARD_PAGES = ["feed", "entries", "posts", "scores", "invite", "settings", "password", "entry-import"];
const ALTERNATE_STATIC_ROOT_URL = config.ROOT_URL;

export class Links {

  public pictureUrl(picturePath: string, model: BookshelfModel): string {
    const rawUpdatedAt = model.get("updated_at");
    const timestamp = (typeof rawUpdatedAt === "object")
      ? rawUpdatedAt.getTime() : rawUpdatedAt; // SQlite/PostgreSQL inconsistency
    return this.staticUrl(picturePath + "?" + timestamp);
  }

  public staticUrl(path: string): string {
    const rootUrl = config.STATIC_ROOT_URL || ALTERNATE_STATIC_ROOT_URL;
    return url.resolve(rootUrl, path);
  }

  /**
   * Determines the route to a page given a model, its type and an optional sub-page
   */
  public routeUrl(model: BookshelfModel, type: string, subPage: string | null = null, options: any = {}) {
    try {
      let subPagePath = (subPage ? "/" + subPage : "");

      if (type === "event") {
        // Event model
        if (model && model.id) {
          return "/" + model.get("name") + subPagePath;
        } else if (subPage === "ajax-find-team-mate") {
          return "/external-entry/ajax-find-team-mate";
        } else if (subPage === "template") {
          return "/pick_event_template";
        } else {
          return "/create_event#appearance";
        }

      } else if (type === "entry") {
        // Entry model
        const array = ["", model.get("event_name") || "external-entry"];
        if (model.id) {
          array.push(model.get("id"), model.get("name"), subPage);
        } else {
          array.push(subPage || "create-entry");
        }
        return array.join("/").replace("//", "/");

      } else if (type === "user") {
        // User Role model / User model
        if (DASHBOARD_PAGES.indexOf(subPage) !== -1) {
          if (options.dashboardAdminMode) {
            subPage += "?user=" + model.get("name") + (options.query ? "&" + options.query : "");
          } else if (options.query) {
            subPage += "?" + options.query;
          }
          const fullPath = "/dashboard/" + subPage;
          if (model) {
            return fullPath;
          } else {
            return "/login?redirect=" + encodeURIComponent(fullPath);
          }
        } else {
          const userName = model.get("name") || model.get("user_name");
          return "/user/" + userName + subPagePath;
        }

      } else if (type === "post") {
        // Post model
        if (subPage === "create") {
          subPagePath += "?";
          if (options.eventId) { subPagePath += "eventId=" + options.eventId; }
          if (options.entryId) { subPagePath += "&entryId=" + options.entryId; }
          if (options.specialPostType) { subPagePath += "&special_post_type=" + options.specialPostType; }
          if (options.title) { subPagePath += "&title=" + options.title; }
          return "/post" + subPagePath;
        } else if (model && typeof model === "object") {
          return "/post/" + model.id + "/" + (model.get("name") || "untitled") + subPagePath;
        } else {
          return "/post/" + model;
        }

      } else if (type === "comment") {
        // Comment model
        let pageParams = "";
        if (model && subPage === "edit") {
          pageParams = "editComment=" + model.id;
        }
        return "?" + pageParams + (model ? "#c" + model.id : "");

      } else if (type === "tags") {
        return "/tags/" + subPage;
      }
    } catch (e) {
      throw new Error('Failed to build URL for model "' + model + '" of type "' + type + '": ' + e.message);
    }
  }

}

export default new Links();
