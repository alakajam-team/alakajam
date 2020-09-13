import Bluebird from "bluebird";
import { BookshelfCollection, BookshelfModel } from "bookshelf";
import * as luxon from "luxon";
import cache from "server/core/cache";
import constants from "server/core/constants";
import db from "server/core/db";
import enums from "server/core/enums";
import { createLuxonDate } from "server/core/formats";
import * as models from "server/core/models";
import settings from "server/core/settings";
import { SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES } from "server/core/settings-keys";
import { User } from "server/entity/user.entity";
import eventThemeService from "./event-theme.service";

const MIN_REMAINING_THEMES = 3;

/**
 * Service for managing the theme shortlist
 */
export class EventThemeShortlistService {

  public async saveShortlistVotes(user: User, event: BookshelfModel, ids: number[]) {
    const shortlistCollection = await this.findShortlist(event);
    const sortedShortlist = shortlistCollection.sortBy((theme) => {
      return ids.indexOf(theme.get("id"));
    });

    let score = constants.SHORTLIST_SIZE;
    const results = [];
    for (const theme of sortedShortlist) {
      results.push(await eventThemeService.saveVote(user, event, theme.get("id"), score, { doNotSave: true }));
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

  public async countShortlistVotes(event: BookshelfModel) {
    return cache.getOrFetch(cache.general, "shortlist_votes_" + event.get("name"),
      async () => {
        return models.ThemeVote
          .where({
            event_id: event.get("id"),
            score: 9,
          })
          .count();
      }, 10 * 60 /* 10 min TTL */);
  }

  /**
   * Retrieves the theme shortlist sorted from best to worst
   * @param event Event
   */
  public async findShortlist(event): Promise<BookshelfCollection> {
    return models.Theme.where({
      event_id: event.get("id"),
      status: "shortlist",
    })
      .orderBy("score", "DESC")
      .fetchAll() as Bluebird<BookshelfCollection>;
  }

  public async computeShortlist(event: BookshelfModel) {
    // Mark all themes as out
    const allThemesCollection = await eventThemeService.findAllThemes(event, { shortlistEligible: true });
    await event.load("details");
    for (const theme of allThemesCollection.models) {
      await eventThemeService.eliminateTheme(theme, event.related("details"), { eliminatedOnShortlistRating: true });
    }

    // Compute new shortlist
    const bestThemeCollection = await this.findBestThemes(event);
    for (const theme of bestThemeCollection.models) {
      theme.set("status", enums.THEME.STATUS.SHORTLIST);
      await theme.save();
    }
  }

  /**
   * Live elimination of the theme shortlist in the moments leading to the jam
   * @param event Event with loaded details
   * @return number of eliminated themes
   */
  public computeEliminatedShortlistThemes(event: BookshelfModel) {
    let eliminated = 0;

    const shortlistEliminationInfo = event.related("details").get("shortlist_elimination");
    if (shortlistEliminationInfo.start && shortlistEliminationInfo.delay
      && parseInt(shortlistEliminationInfo.delay, 10) > 0) {
      const delayInMinutes = parseInt(shortlistEliminationInfo.delay, 10);
      let eliminationDate = createLuxonDate(shortlistEliminationInfo.start);
      const now = luxon.DateTime.local();

      // Don't allow eliminating all themes
      while (eliminationDate < now && eliminated < this.getMaxEliminatedShortlistThemes()) {
        eliminationDate = eliminationDate.plus({ minute: delayInMinutes });
        eliminated++;
      }
    }

    return eliminated;
  }

  private getMaxEliminatedShortlistThemes() {
    return constants.SHORTLIST_SIZE - MIN_REMAINING_THEMES;
  }

  /**
   * @param event Event with loaded details
   * @return moment time
   */
  public computeNextShortlistEliminationTime(event: BookshelfModel) {
    let eliminated = 0;

    const shortlistEliminationInfo = event.related("details").get("shortlist_elimination");
    const maxEliminatedShortListThemes = this.getMaxEliminatedShortlistThemes();
    if (shortlistEliminationInfo.start) {
      let nextEliminationDate = createLuxonDate(shortlistEliminationInfo.start);
      const now = luxon.DateTime.local();

      if (now < nextEliminationDate) {
        return nextEliminationDate;
      } else if (shortlistEliminationInfo.delay && parseInt(shortlistEliminationInfo.delay, 10) > 0) {
        const delayInMinutes = parseInt(shortlistEliminationInfo.delay, 10);

        // Don't allow eliminating all themes
        while (nextEliminationDate < now && eliminated < maxEliminatedShortListThemes) {
          nextEliminationDate = nextEliminationDate.plus({ minute: delayInMinutes });
          eliminated++;
        }

        if (eliminated < maxEliminatedShortListThemes) {
          return nextEliminationDate;
        }
      }
    }

    return null;
  }

  public async findBestThemes(event: BookshelfModel): Promise<BookshelfCollection> {
    const eliminationMinNotes = await settings.findNumber(SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, 5);
    return models.Theme.where({
      event_id: event.get("id"),
    })
      .where("status", "<>", enums.THEME.STATUS.BANNED)
      .where("notes", ">=", eliminationMinNotes)
      .orderBy("rating_shortlist", "DESC")
      .orderBy("created_at")
      .fetchPage({ pageSize: constants.SHORTLIST_SIZE });
  }

}

export default new EventThemeShortlistService();
