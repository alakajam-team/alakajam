import Bluebird from "bluebird";
import { BookshelfCollection, BookshelfModel, FetchAllOptions, SaveOptions, SyncOptions } from "bookshelf";
import * as lodash from "lodash";
import cache from "server/core/cache";
import { ilikeOperator } from "server/core/config";
import db from "server/core/db";
import enums from "server/core/enums";
import { createLuxonDate } from "server/core/formats";
import forms from "server/core/forms";
import log from "server/core/log";
import * as models from "server/core/models";
import settings from "server/core/settings";
import {
  SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES,
  SETTING_EVENT_THEME_ELIMINATION_MODULO,
  SETTING_EVENT_THEME_ELIMINATION_THRESHOLD,
  SETTING_EVENT_THEME_IDEAS_REQUIRED,
  SETTING_EVENT_THEME_SHORTLIST_SIZE,
  SETTING_EVENT_THEME_SUGGESTIONS
} from "server/core/settings-keys";
import { User } from "server/entity/user.entity";
import themeStatsService from "./theme-stats.service";

/**
 * Service for managing theme voting
 */
export class ThemeService {

  /**
   * Saves the theme ideas of an user for an event
   * @param user user model
   * @param event event model
   * @param ideas An array of exactly 3 ideas: [{title, id}]. Not filling the title
   * deletes the idea, not filling the ID creates one instead of updating it.
   */
  public async saveThemeSubmissions(
    user: User,
    event: BookshelfModel,
    ideas: Array<{ id?: string; title: string }>): Promise<void> {
    const ideasToKeep: Array<{ id?: string; title: string }> = [];
    const ideasToCreate: Array<{ id?: string; title: string }> = [];
    const themesToDelete: BookshelfModel[] = [];

    // Compare form with the existing user themes
    const existingThemes = await this.findThemesByUser(user, event);
    for (const existingTheme of existingThemes.models) {
      const ideaFound = ideas.find((idea) => parseInt(idea.id, 10) === existingTheme.get("id"));
      if (!ideaFound || ideaFound.title !== existingTheme.get("title")) {
        if (existingTheme.get("status") === enums.THEME.STATUS.ACTIVE ||
          existingTheme.get("status") === enums.THEME.STATUS.DUPLICATE) {
          themesToDelete.push(existingTheme);
        }
      } else {
        ideasToKeep.push(ideaFound);
      }
    }
    for (const idea of ideas) {
      if (!ideasToKeep.includes(idea) && idea.title) {
        ideasToCreate.push(idea);
      }
    }

    // Delete obsolete themes
    const tasks: Array<Promise<any>> = [];
    let ideasSubmitted = existingThemes.models.length - themesToDelete.length;
    for (const themeToDelete of themesToDelete) {
      tasks.push(themeToDelete.destroy());
    }
    await Promise.all(tasks);

    // Create themes
    const maxThemeSuggestions = await settings.findNumber(SETTING_EVENT_THEME_SUGGESTIONS, 3);
    for (const idea of ideasToCreate) {
      if (ideasSubmitted < maxThemeSuggestions) {
        const theme = new models.Theme({
          user_id: user.get("id"),
          event_id: event.get("id"),
          title: idea.title,
          status: enums.THEME.STATUS.ACTIVE,
        }) as BookshelfModel;
        await this.handleDuplicates(theme);
        await theme.save();
        ideasSubmitted++;
      } else {
        break;
      }
    }

    themeStatsService.refreshEventThemeStats(event)
      .catch(e => log.error(e));
  }

  public async findAllThemes(event: BookshelfModel, options: { shortlistEligible?: boolean } = {}): Promise<BookshelfCollection> {
    let query = models.Theme.where("event_id", event.get("id")) as BookshelfModel;
    if (options.shortlistEligible) {
      query = query.where("status", "<>", enums.THEME.STATUS.OUT)
        .where("status", "<>", enums.THEME.STATUS.BANNED);
    }
    return query.orderBy("normalized_score", "DESC")
      .orderBy("created_at")
      .fetchAll() as Bluebird<BookshelfCollection>;
  }

  public async findThemeById(id: number): Promise<BookshelfModel> {
    return models.Theme.where("id", id).fetch();
  }

  public async findThemesByUser(user: User, event: BookshelfModel): Promise<BookshelfCollection> {
    return models.Theme.where({
      user_id: user.get("id"),
      event_id: event.get("id"),
    })
      .orderBy("id")
      .fetchAll() as Bluebird<BookshelfCollection>;
  }

  public async findThemesByTitle(title: string, options: FetchAllOptions = {}): Promise<BookshelfCollection> {
    return models.Theme.where("title", ilikeOperator(), title)
      .orderBy("created_at")
      .fetchAll(options) as Bluebird<BookshelfCollection>;
  }

  public async eliminateTheme(
    theme: BookshelfModel,
    eventDetails: BookshelfModel,
    options: { eliminatedOnShortlistRating?: boolean } & SaveOptions = {}): Promise<void> {
    // Compute ranking as %-age because new submissions would make this number irrelevant
    const themeRanking = await this.findThemeRanking(theme, { useShortlistRating: options.eliminatedOnShortlistRating, ...options });
    const rankingPercent = 1.0 * themeRanking / (eventDetails.get("theme_count") || 1);

    theme.set({
      status: enums.THEME.STATUS.OUT,
      ranking: rankingPercent
    });
    await theme.save(null, options);
  }

  public async findThemeRanking(
    theme: BookshelfModel,
    options: { useShortlistRating?: boolean } & SyncOptions = {}): Promise<number> {
    let betterThemeQuery = models.Theme.where("event_id", theme.get("event_id")) as BookshelfModel;

    if (theme.get("status") === enums.THEME.STATUS.SHORTLIST) {
      betterThemeQuery = betterThemeQuery.where("score", ">", theme.get("score"));
    } else if (parseFloat(theme.get("rating_shortlist")) === 0 && parseFloat(theme.get("rating_elimination")) === 1) {
      // Retro-compatibility with old system
      betterThemeQuery = betterThemeQuery.where("normalized_score", ">", theme.get("normalized_score"));
    } else if (options.useShortlistRating) {
      betterThemeQuery = betterThemeQuery.where("rating_shortlist", ">", theme.get("rating_shortlist"));
    } else {
      betterThemeQuery = betterThemeQuery.where("rating_elimination", ">", theme.get("rating_elimination"));
    }

    const betterThemeCount = await betterThemeQuery.count(null, options);
    return forms.parseInt(betterThemeCount) + 1;
  }

  /**
   * Sets the theme status to "duplicate" if another theme is identical
   */
  private async handleDuplicates(theme: BookshelfModel): Promise<void> {
    theme.set("slug", forms.slug(theme.get("title")));

    let query = models.Theme.where({
      slug: theme.get("slug"),
      event_id: theme.get("event_id"),
    }) as BookshelfModel;
    if (theme.get("id")) {
      query = query.where("id", "<>", theme.get("id"));
    }
    if ((await query.fetch()) !== null) {
      theme.set("status", enums.THEME.STATUS.DUPLICATE);
    }
  }

}

export default new ThemeService();
