import { BookshelfCollection, BookshelfModel } from "bookshelf";
import * as lodash from "lodash";
import cache from "server/core/cache";
import db from "server/core/db";
import enums from "server/core/enums";
import * as models from "server/core/models";
import settings from "server/core/settings";
import {
  SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES,
  SETTING_EVENT_THEME_ELIMINATION_MODULO,
  SETTING_EVENT_THEME_ELIMINATION_THRESHOLD,
  SETTING_EVENT_THEME_IDEAS_REQUIRED,
  SETTING_EVENT_THEME_SHORTLIST_SIZE
} from "server/core/settings-keys";
import { User } from "server/entity/user.entity";
import themeShortlistService from "./theme-shortlist.service";
import themeStatsService from "./theme-stats.service";
import themeService from "./theme.service";

/**
 * Service for managing theme voting
 */
export class ThemeService {

  public async isThemeVotingAllowed(event: BookshelfModel): Promise<boolean> {
    if (event.get("status_theme") === enums.EVENT.STATUS_THEME.VOTING) {
      const themeIdeasRequired = await settings.findNumber(SETTING_EVENT_THEME_IDEAS_REQUIRED, 10);
      const activeThemeCount = event.related<BookshelfModel>("details").get("active_theme_count");
      return activeThemeCount >= themeIdeasRequired;
    } else {
      return false;
    }
  }

  /**
   * Returns the 30 latest votes by the user
   */
  public async findThemeVotesHistory(
    user: User, event: BookshelfModel, options: { count?: boolean } = {}): Promise<BookshelfCollection | string | number> {
    const query = models.ThemeVote.where({
      event_id: event.get("id"),
      user_id: user.get("id"),
    });
    if (options.count) {
      return query.count();
    } else {
      return query.orderBy("id", "DESC")
        .fetchPage({
          pageSize: 30,
          withRelated: ["theme"],
        });
    }
  }

  /**
   * Returns a page of 10 themes that a user can vote on
   * @param user {User} (optional) user model
   * @param event {Event} event model
   */
  public async findThemesToVoteOn(user: User, event: BookshelfModel): Promise<BookshelfCollection> {
    let query = models.Theme as BookshelfModel;
    if (user) {
      query = query.query((qb) => {
        void qb.leftOuterJoin("theme_vote", function() {
          this.on("theme.id", "=", "theme_vote.theme_id");
          this.andOn("theme_vote.user_id", "=", user.get("id"));
        });
      })
        .where({
          "status": enums.THEME.STATUS.ACTIVE,
          "theme.event_id": event.get("id"),
          "theme_vote.user_id": null,
        })
        .where("theme.user_id", "<>", user.get("id"));
    } else {
      query = query.where("event_id", event.get("id"))
        .where("status", "IN", [enums.THEME.STATUS.ACTIVE, enums.THEME.STATUS.SHORTLIST]);
    }
    const themesCollection = await query.orderBy("updated_at")
      .fetchPage({ pageSize: 20 });

    // Grab the 20 oldest theme ideas, then just keep the 10 with the least notes.
    // This helps new themes catch up with the pack fast, while being much better randomized
    // than just showing the themes with the least notes.
    const sortedThemes = themesCollection.sortBy((theme) => theme.get("notes"));
    const themesToVoteOn = lodash.shuffle(sortedThemes.splice(0, 10));
    return new db.Collection(themesToVoteOn) as BookshelfCollection;
  }

  /**
   * Saves a theme vote
   */
  public async saveVote(
    user: User, event: BookshelfModel, themeId: number, score: number, options: { doNotSave?: boolean } = {}) {
    let voteCreated = false;
    let expectedStatus = null;
    let result = {};

    if (event.get("status_theme") === enums.EVENT.STATUS_THEME.VOTING && [-1, 1].indexOf(score) !== -1) {
      expectedStatus = enums.THEME.STATUS.ACTIVE;
    } else if (event.get("status_theme") === enums.EVENT.STATUS_THEME.SHORTLIST) {
      const shortlistSize = await themeShortlistService.getShortlistSize(event);
      if (score >= 1 && score <= shortlistSize) {
        expectedStatus = enums.THEME.STATUS.SHORTLIST;
      }
    }

    if (expectedStatus) {
      const theme = await models.Theme.where("id", themeId).fetch();

      if (theme.get("status") === expectedStatus) {
        let vote = await models.ThemeVote.where({
          user_id: user.get("id"),
          event_id: event.get("id"),
          theme_id: themeId,
        }).fetch();

        if (vote) {
          theme.set("score", theme.get("score") + score - (vote.get("score") || 0));
          vote.set("score", score);
        } else {
          theme.set({
            score: theme.get("score") + score,
            notes: theme.get("notes") + 1,
          });
          vote = new models.ThemeVote({
            theme_id: themeId,
            user_id: user.get("id"),
            event_id: event.get("id"),
            score,
          }) as BookshelfModel;
          voteCreated = true;
        }

        if (event.get("status_theme") !== enums.EVENT.STATUS_THEME.SHORTLIST) {
          const positiveVotes = (theme.get("notes") + theme.get("score")) / 2.0;
          const wilsonBounds = this.computeWilsonBounds(positiveVotes, theme.get("notes"));
          theme.set({
            rating_elimination: wilsonBounds.high,
            rating_shortlist: wilsonBounds.low,
            normalized_score: 1.0 * theme.get("score") / theme.get("notes"),
          });
        }

        result = {
          theme,
          vote,
        };
        if (!options.doNotSave) {
          await Promise.all([theme.save(), vote.save()]);
        }
      }
    }

    if (expectedStatus === enums.THEME.STATUS.ACTIVE && voteCreated) {
      // Eliminate lowest themes every x votes. No need for DB calls, just count in-memory
      const eliminationThreshold = await settings.findNumber(
        SETTING_EVENT_THEME_ELIMINATION_MODULO, 10);
      let uptimeVotes: number = cache.general.get("uptime_votes") || 0;
      if (uptimeVotes % eliminationThreshold === 0) {
        await this.eliminateLowestThemes(event);
      }
      await themeStatsService.refreshEventThemeStats(event);

      uptimeVotes++;
      cache.general.set("uptime_votes", uptimeVotes);
    }

    return result;
  }

  private computeWilsonBounds(positive: number, total: number) {
    if (total === 0) {
      return { low: 0, high: 1 };
    } else {
      // Equation source: http://www.evanmiller.org/how-not-to-sort-by-average-rating.html
      const z = 3.0;
      const phat = 1.0 * positive / total;
      const zsqbyn = z * z / total;
      const uncertainty = z * Math.sqrt((phat * (1 - phat) + zsqbyn / 4) / total);
      return {
        low: (phat + zsqbyn / 2 - uncertainty) / (1 + zsqbyn),
        high: (phat + zsqbyn / 2 + uncertainty) / (1 + zsqbyn),
      };
    }
  }

  private async eliminateLowestThemes(event: BookshelfModel) {
    const eliminationMinNotes = await settings.findNumber(
      SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, 5);
    const eliminationThreshold = await settings.findNumber(
      SETTING_EVENT_THEME_ELIMINATION_THRESHOLD, 0.58);

    const battleReadyThemesQuery = models.Theme.where({
      event_id: event.get("id"),
      status: enums.THEME.STATUS.ACTIVE,
    })
      .where("notes", ">=", eliminationMinNotes);

    // Make sure we have at least enough themes to fill our shortlist before removing some
    const battleReadyThemeCount = parseInt((await battleReadyThemesQuery.count()).toString(), 10);
    const shortlistSize = await settings.findNumber(SETTING_EVENT_THEME_SHORTLIST_SIZE, 10);
    if (battleReadyThemeCount > shortlistSize) {
      const loserThemes = await models.Theme.where({
        event_id: event.get("id"),
        status: enums.THEME.STATUS.ACTIVE,
      })
        .where("notes", ">=", eliminationMinNotes)
        .where("rating_elimination", "<", eliminationThreshold)
        .orderBy("rating_elimination")
        .orderBy("created_at", "desc")
        .fetchAll() as BookshelfCollection;

      await event.load("details");
      const eliminatedThemes = loserThemes.slice(0,
        Math.min(battleReadyThemeCount - shortlistSize, loserThemes.length));
      for (const eliminatedTheme of eliminatedThemes) {
        await themeService.eliminateTheme(eliminatedTheme, event.related("details"));
      }
    }
  }

}

export default new ThemeService();
