/**
 * Blog post service.
 *
 * @module services/post-service
 */

import * as fs from "fs";
import * as path from "path";
import * as requestPromise from "request-promise-native";
import { promisify } from "util";
import cache from "../core/cache";
import config from "../core/config";
import constants from "../core/constants";
import log from "../core/log";

export class ArticleService {

  private readonly ARTICLES_DATA_PATH = path.resolve(constants.ROOT_PATH, "server/docs/article-data");

  private readonly readFilePromise = promisify(fs.readFile);

  /**
   * Finds one article by its name
   * @param  {string} article name (slug)
   * @return {string} markdown content
   */
  public async findArticle(articleName: string): Promise<string|null> {
    if (config.DEBUG_ARTICLES) {
      const article = await this.readFilePromise(path.resolve(this.ARTICLES_DATA_PATH, articleName + ".md"));
      if (article) {
        return article.toString();
      }
    } else {
      return cache.getOrFetch(cache.articles, articleName, async () => {
        let result = null;
        try {
          result = await requestPromise(constants.ARTICLES_ROOT_URL + articleName + ".md");
        } catch (e) {
          log.warn("Article not found: " + articleName);
        }
        return result;
      });
    }
  }

}

export default new ArticleService();
