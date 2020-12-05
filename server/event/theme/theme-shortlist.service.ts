import Bluebird from "bluebird";
import { BookshelfCollection, BookshelfModel } from "bookshelf";
import cache from "server/core/cache";
import db from "server/core/db";
import enums from "server/core/enums";
import { createLuxonDate } from "server/core/formats";
import forms from "server/core/forms";
import * as models from "server/core/models";
import settings from "server/core/settings";
import { SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, SETTING_EVENT_THEME_SHORTLIST_SIZE } from "server/core/settings-keys";
import { ThemeShortlistEliminationState } from "server/entity/event-details.entity";
import { User } from "server/entity/user.entity";
import themeVotingService from "./theme-voting.service";
import themeService from "./theme.service";

/**
 * Service for managing the theme shortlist
 */
export class EventThemeShortlistService {

  public readonly MIN_REMAINING_THEMES = 3;

  public async getShortlistSize(event: BookshelfModel): Promise<number> {
    const count = await models.Theme.where({ event_id: event.get("id") })
      .query(qb => qb.whereIn("status", [enums.THEME.STATUS.SHORTLIST, enums.THEME.STATUS.SHORTLIST_OUT]))
      .count();
    return forms.parseInt(count);
  }

  /**
   * Retrieves the theme shortlist sorted from best to worst
   * @param event Event
   */
  public async findShortlist(event: BookshelfModel): Promise<BookshelfCollection> {
    return models.Theme.where("event_id", event.get("id"))
      .query(qb => qb.whereIn("status", [enums.THEME.STATUS.SHORTLIST, enums.THEME.STATUS.SHORTLIST_OUT]))
      .orderBy("score", "DESC")
      .fetchAll() as Bluebird<BookshelfCollection>;
  }

  public async computeShortlist(event: BookshelfModel): Promise<void> {
    // Mark all themes as out
    const allThemesCollection = await themeService.findAllThemes(event, { shortlistEligible: true });
    await event.load("details");
    for (const theme of allThemesCollection.models) {
      await themeService.eliminateTheme(theme, event.related("details"), { eliminatedOnShortlistRating: true });
    }

    // Compute new shortlist
    const shortlistSize = await settings.findNumber(SETTING_EVENT_THEME_SHORTLIST_SIZE, 10);
    const bestThemeCollection = await this.findBestThemes(event, shortlistSize);
    for (const theme of bestThemeCollection.models) {
      theme.set("status", enums.THEME.STATUS.SHORTLIST);
      await theme.save();
    }
  }

  private async findBestThemes(event: BookshelfModel, limit: number): Promise<BookshelfCollection> {
    const eliminationMinNotes = await settings.findNumber(SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, 5);
    return models.Theme.where({
      event_id: event.get("id"),
    })
      .where("status", "<>", enums.THEME.STATUS.BANNED)
      .where("notes", ">=", eliminationMinNotes)
      .orderBy("rating_shortlist", "DESC")
      .orderBy("created_at")
      .query(qb => qb.limit(limit))
      .fetchAll() as Bluebird<BookshelfCollection>;
  }

  public async saveShortlistVotes(user: User, event: BookshelfModel, ids: number[]): Promise<void> {
    const shortlistCollection = await this.findShortlist(event);
    const sortedShortlist = shortlistCollection
      .sortBy(theme => ids.indexOf(theme.get("id")))
      .filter(theme => ids.includes(theme.get("id")));

    let score = await this.getShortlistSize(event);
    const results = [];
    for (const theme of sortedShortlist) {
      results.push(await themeVotingService.saveVote(user, event, theme.get("id"), score, { doNotSave: true }));
      score--;
    }

    await db.transaction(async (transaction) => {
      const saveOptions = { transacting: transaction };
      for (const result of results) {
        if (result.theme) { await result.theme.save(null, saveOptions); }
        if (result.vote) { await result.vote.save(null, saveOptions); }
      }
    });
  }

  public async findThemeShortlistVotes(event: BookshelfModel, options: { user?: User; score?: number } = {}): Promise<BookshelfCollection> {
    const shortlistCollection = await this.findShortlist(event);
    const shortlistIds = [];
    shortlistCollection.forEach((theme) => shortlistIds.push(theme.get("id")));

    const searchCriteria: Record<string, any> = {};
    const withRelated: string[] = [];
    if (options.user) {
      searchCriteria.user_id = options.user.get("id");
    }
    if (options.score) {
      searchCriteria.score = options.score;
      withRelated.push("user");
    }

    return models.ThemeVote.where(searchCriteria)
      .where("theme_id", "IN", shortlistIds)
      .fetchAll({ withRelated }) as Bluebird<BookshelfCollection>;
  }

  public async countShortlistVotes(event: BookshelfModel): Promise<number> {
    return cache.getOrFetch(cache.general, "shortlist_votes_" + event.get("name"), () => {
      return forms.parseInt(models.ThemeVote
        .where({
          event_id: event.get("id"),
          score: 9,
        })
        .count());
    }, 10 * 60 /* 10 min TTL */);
  }

  public async updateShortlistAutoElimination(event: BookshelfModel): Promise<void> {
    if (this.isShortlistAutoEliminationEnabled(event)) {
      const eventDetails = event.related<BookshelfModel>("details");
      const shortlistElimination: ThemeShortlistEliminationState = eventDetails.get("shortlist_elimination");
      const shortlistSize = await this.getShortlistSize(event);
      const maxEliminatedShortlistThemes = this.getMaxEliminatedShortlistThemes(shortlistSize);

      let themesToEliminate = 0;
      let newNextElimination = createLuxonDate(shortlistElimination.nextElimination);
      while (newNextElimination.diffNow().as("minutes") < 0
        && shortlistElimination.eliminatedCount + themesToEliminate < maxEliminatedShortlistThemes) {
        themesToEliminate++;
        newNextElimination = newNextElimination.plus({
          minutes: shortlistElimination.minutesBetweenEliminations
        });
      }

      let stateChanged = false;
      if (themesToEliminate > 0) {
        // Update elimination count
        shortlistElimination.eliminatedCount += themesToEliminate;
        shortlistElimination.nextElimination = newNextElimination.toISO();
        stateChanged = true;
      }
      if (shortlistElimination.eliminatedCount >= maxEliminatedShortlistThemes) {
        // Stop automatic eliminations when we reach the limit
        shortlistElimination.eliminatedCount = maxEliminatedShortlistThemes;
        delete shortlistElimination.nextElimination;
        stateChanged = true;
      }

      if (stateChanged) {
        await eventDetails.save({ shortlist_elimination: shortlistElimination });
        cache.eventsById.del(event.get("id"));
        cache.eventsByName.del(event.get("name"));
      }
    }

    await this.refreshShortlistThemesStatus(event);
  }

  public isShortlistAutoEliminationEnabled(event: BookshelfModel): boolean {
    const shortlistElimination = this.getShortlistEliminationState(event);
    return shortlistElimination.nextElimination && shortlistElimination.minutesBetweenEliminations > 0;
  }

  public async eliminateOneShorlistTheme(event: BookshelfModel): Promise<void> {
    const shortlistElimination = this.getShortlistEliminationState(event);
    shortlistElimination.eliminatedCount = (shortlistElimination.eliminatedCount || 0) + 1;

    await this.refreshShortlistThemesStatus(event);
    await event.related<BookshelfModel>("details").save({ shortlist_elimination: shortlistElimination });
    cache.eventsById.del(event.get("id"));
    cache.eventsByName.del(event.get("name"));
  }

  private async refreshShortlistThemesStatus(event: BookshelfModel) {
    const shortlist = await this.findShortlist(event);
    const activeShortlist = shortlist
      .sortBy(theme => theme.get("score"))
      .filter(theme => theme.get("status") === enums.THEME.STATUS.SHORTLIST);
    const eliminatedShortlist = shortlist
      .sortBy(theme => theme.get("score"))
      .filter(theme => theme.get("status") === enums.THEME.STATUS.SHORTLIST_OUT);

    const shortlistElimination = this.getShortlistEliminationState(event);

    if (shortlistElimination.eliminatedCount > eliminatedShortlist.length) {
      // Mark some themes as out
      const activeCount = shortlist.length - shortlistElimination.eliminatedCount;
      const toEliminate = activeShortlist.length - activeCount;
      for (const theme of activeShortlist.slice(0, toEliminate)) {
        await theme.save({ status: enums.THEME.STATUS.SHORTLIST_OUT });
      }
    } else if (shortlistElimination.eliminatedCount < eliminatedShortlist.length) {
      // Restore some themes
      const toRestore = eliminatedShortlist.length - shortlistElimination.eliminatedCount;
      for (const theme of eliminatedShortlist.slice(-toRestore)) {
        await theme.save({ status: enums.THEME.STATUS.SHORTLIST });
      }
    }
  }

  private getShortlistEliminationState(event: BookshelfModel): ThemeShortlistEliminationState {
    const eventDetails = event.related<BookshelfModel>("details");
    return eventDetails.get("shortlist_elimination");
  }

  private getMaxEliminatedShortlistThemes(shortlistSize: number) {
    return shortlistSize - this.MIN_REMAINING_THEMES;
  }

}

export default new EventThemeShortlistService();
