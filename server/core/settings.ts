
/**
 * Manipulate global settings
 */

import cache from "server/core/cache";
import log from "server/core/log";
import * as models from "server/core/models";
import { SETTING_ARTICLE_SIDEBAR } from "./settings-keys";

type DefaultValueEval = () => string;

export type ArticleSidebarCategory = Array<{
  title: string;
  links: Array<{
    title: string;
    url: string;
  }>;
}>;

export class Settings {

  /**
   * Fetches a Setting and returns its value.
   * @param key {id} Key
   * @param default {string|function} An optional default value.
   *   If a function is passed, it will be evaluated first.
   * @returns {void}
   */
  public async find(key, defaultValue?: string | DefaultValueEval): Promise<string> {
    if (!cache.settings.get(key)) {
      if (!key) {
        throw new Error("Undefined key, you might have forgotten to declare a constant");
      }
      const settingModel = await models.Setting.where("key", key).fetch();
      cache.settings.set(key, settingModel ? settingModel.get("value") : undefined);
    }
    const value = cache.settings.get<string>(key);
    if (value) {
      return value;
    } else if (typeof defaultValue === "function") {
      return defaultValue();
    } else {
      return defaultValue;
    }
  }

  public async findNumber(key: string, defaultValue: number) {
    const settingValue = await this.find(key, defaultValue.toString());
    return parseFloat(settingValue);
  }

  public async findArticlesSidebar(category: "about" | "docs"): Promise<ArticleSidebarCategory> {
    const articlesSidebar = await this.find(SETTING_ARTICLE_SIDEBAR);
    if (articlesSidebar) {
      let sidebar;
      try {
        sidebar = JSON.parse(articlesSidebar);
        if (sidebar[category]) {
          return sidebar[category];
        } else {
          log.error(`Invalid SETTING_ARTICLE_SIDEBAR setting: no "${category}" article category found`);
        }
      } catch (e) {
        log.error("Invalid SETTING_ARTICLE_SIDEBAR setting: malformed JSON");
      }
    }
    return [];
  }

  /**
   * Sets a Setting value.
   * @param key {id} Key
   * @param value {string} The new value
   * @returns {void}
   */
  public async save(key, value) {
    let settingModel = await models.Setting.where("key", key).fetch();
    let method = "update";
    if (!settingModel) {
      settingModel = new models.Setting({ key });
      method = "insert"; // setting the ID manually makes Bookshelf assume an update
    }
    settingModel.set("value", value);
    await settingModel.save(null, { method });
    cache.settings.del(key);
  }

}

export default new Settings();
