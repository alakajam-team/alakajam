
/**
 * Service for importing entries from third-party websites
 *
 * @module services/highscore-service
 */

import Bluebird = require("bluebird");
import { BookshelfCollection, BookshelfModel, FetchAllOptions, FetchOptions, SortOrder } from "bookshelf";
import db from "server/core/db";
import enums from "server/core/enums";
import fileStorage from "server/core/file-storage";
import { createLuxonDate } from "server/core/formats";
import forms from "server/core/forms";
import * as models from "server/core/models";
import eventTournamentService from "server/event/tournament/tournament.service";

export class HighScoreService {

  public async findHighScores(entry: BookshelfModel, options: any = {}): Promise<BookshelfCollection> {
    const query = models.EntryScore.where("entry_id", entry.get("id"));
    if (!options.withSuspended) {
      query.where("active", true);
    }
    query.orderBy("ranking");

    const fetchOptions: any = {
      withRelated: ["user"],
    };
    if (options.fetchAll) {
      return query.fetchAll(fetchOptions) as Bluebird<BookshelfCollection>;
    } else {
      fetchOptions.pageSize = 10;
      return query.fetchPage(fetchOptions);
    }
  }

  public async findHighScoresMap(entries: BookshelfModel[]): Promise<Record<number, BookshelfCollection>> {
    const highScoresMap: Record<number, BookshelfCollection> = {};
    for (const entry of entries) {
      highScoresMap[entry.get("id")] = await this.findHighScores(entry);
    }
    return highScoresMap;
  }

  public async createEntryScore(userId: number, entryId: number): Promise<BookshelfModel> {
    const entryScore = new models.EntryScore({
      user_id: userId,
      entry_id: entryId,
    });
    await entryScore.load(["user"]);
    return entryScore;
  }

  public async findEntryScore(userId: number, entryId: number): Promise<BookshelfModel | null> {
    if (userId && entryId) {
      return models.EntryScore.where({
        user_id: userId,
        entry_id: entryId,
      })
        .fetch({ withRelated: ["user"], require: false });
    } else {
      return null;
    }
  }

  public async findEntryScoreById(id: number, options: FetchOptions = {}) {
    return models.EntryScore.where("id", id)
      .fetch({
        withRelated: ["user"],
        ...options
      });
  }

  /**
   * Retrieves all user scores
   */
  public async findUserScores(userId, options: FetchAllOptions & { sortBy?: "ranking" | "submitted_at" | any } = {}): Promise<BookshelfCollection> {
    if (!userId) { return null; }

    let query = models.EntryScore.where("user_id", userId) as BookshelfModel;
    switch (options.sortBy) {
    case "ranking":
      query = query.orderBy("ranking");
      break;
    case "submitted_at":
      query = query.orderBy("submitted_at", "DESC");
      break;
    default:
    }

    // PERF: Entry details required to format scores
    return query.fetchAll({
      withRelated: ["entry.userRoles", "entry.details"],
      ...options
    }) as Bluebird<BookshelfCollection>;
  }

  /**
   * Finds all scores submitted by a user to the specified entry array or collection
   */
  public async findUserScoresMapByEntry(userId, entries): Promise<Record<number, BookshelfModel>> {
    if (!userId || !entries) { return null; }

    entries = entries.models || entries; // Accept collections or arrays

    const entriesToScore: Record<number, BookshelfModel> = {};
    const entryScores = await models.EntryScore
      .where("user_id", userId)
      .where("entry_id", "in", entries.map((entry) => entry.get("id")))
      .fetchAll({ withRelated: ["user"] });
    for (const entry of entries) {
      entriesToScore[entry.get("id")] = entryScores.find((score) => score.get("entry_id") === entry.get("id"));
    }
    return entriesToScore;
  }

  /**
   * Returns the date of the last submitted score for all the specified entries
   */
  public async findEntriesLastActivity(entryIds: number[]): Promise<Record<number, Date>> {
    const rows = await db.knex("entry_score")
      .select("entry_id")
      .max("submitted_at as max_submitted_at")
      .groupBy("entry_id")
      .where("entry_id", "in", entryIds);

    const entryIdToSubmittedAt: Record<number, Date> = {};
    rows.forEach((row) => {
      entryIdToSubmittedAt[row.entry_id] = row.max_submitted_at;
    });
    return entryIdToSubmittedAt;
  }

  /**
   * Finds the most recently active entry scores
   */
  public async findRecentlyActiveEntries(
    options: { limit?: number; eventId?: number } = {}): Promise<BookshelfCollection> {
    const entryScoreIds = await db.knex.select("entry_score.id")
      .from(function() {
        const qb = this.distinct("entry_score.entry_id")
          .max("entry_score.submitted_at as max_submitted_at")
          .from("entry_score");
        if (options.eventId) {
          qb.leftJoin("tournament_entry", "tournament_entry.entry_id", "entry_score.entry_id")
            .where("tournament_entry.event_id", options.eventId);
        }
        qb.groupBy("entry_score.entry_id")
          .orderBy("max_submitted_at", "DESC")
          .limit(options.limit || 10)
          .as("active");
      })
      .innerJoin("entry_score", function() {
        this.on("entry_score.submitted_at", "=", "active.max_submitted_at")
          .andOn("entry_score.entry_id", "=", "active.entry_id");
      })
      .orderBy("active.max_submitted_at", "DESC");

    // PERF: Entry details required to format scores
    return models.EntryScore
      .where("id", "IN", entryScoreIds.map((row) => row.id))
      .orderBy("submitted_at", "DESC")
      .fetchAll({ withRelated: ["entry.details", "user"] }) as Bluebird<BookshelfCollection>;
  }

  /**
   * @return any errors, or the updated entry score (ie. with the ranking set)
   */
  public async submitEntryScore(entryScore: BookshelfModel, entry: BookshelfModel): Promise< { error: string } | BookshelfModel> {
    if (!entryScore || !entry) {
      return { error: "Internal error (missing score information)" };
    }
    if (entryScore.get("score") === 0) {
      return { error: "Invalid score" };
    }

    if (entry.get("status_high_score") !== enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
      if (entryScore.hasChanged()) {
        // Check ranking before accepting proof-less score
        if (!entryScore.get("proof")) {
          const higherScoreCount = await models.EntryScore
            .where("entry_id", entry.get("id"))
            .where("score", this.rankingOperator(entry), entryScore.get("score"))
            .count();
          const ranking = parseInt(higherScoreCount.toString(), 10) + 1;
          if (ranking <= 10) {
            return { error: "Pic or it didn't happen! You need a screenshot to get in the Top 10 :)" };
          }
        }

        // Save score
        entryScore.set({
          active: true,
          submitted_at: createLuxonDate().toJSDate()
        });
        await entryScore.save();

        // Refresh rankings
        const updatedEntryScore = await this.refreshEntryRankings(entry, entryScore);
        return updatedEntryScore || entryScore;
      } else {
        return entryScore;
      }
    } else {
      return { error: "High scores are disabled on this entry" };
    }
  }

  public async setEntryScoreActive(id: number, active: boolean): Promise<void> {
    const entryScore = await this.findEntryScoreById(id, { withRelated: ["entry.details"] });
    if (entryScore && entryScore.get("active") !== active) {
      entryScore.set("active", active);
      await entryScore.save();
      await this.refreshEntryRankings(entryScore.related("entry"), entryScore, { updateTournamentIfClosed: true });
    }
  }

  public async deleteEntryScore(entryScore: BookshelfModel, entry: BookshelfModel): Promise<void> {
    if (!this.isExternalProof(entryScore)) {
      fileStorage.remove(entryScore.get("proof"));
    }
    const triggeringUserId = entryScore.get("user_id");
    await entryScore.destroy();
    await this.refreshEntryRankings(entry, null, { triggeringUserId });
  }

  public async deleteAllEntryScores(entry): Promise<void> {
    await db.knex("entry_score")
      .where("entry_id", entry.get("id"))
      .delete();
    await this.refreshEntryRankings(entry);
  }

  public async refreshEntryRankings(
    entry: BookshelfModel,
    triggeringEntryScore?: BookshelfModel,
    options: { triggeringUserId?: number; updateTournamentIfClosed?: boolean } = {}): Promise<BookshelfModel | undefined> {

    let updatedEntryScore: BookshelfModel | undefined;
    const impactedEntryScores = [];

    const scores = await models.EntryScore
      .where("entry_id", entry.get("id"))
      .orderBy("score", this.rankingDir(entry))
      .orderBy("submitted_at")
      .fetchAll() as BookshelfCollection;

    await db.transaction(async (transaction) => {
      let ranking = 1;
      for (const score of scores.models) {
        if (score.get("ranking") !== ranking) {
          score.set("ranking", ranking);
          await score.save(null, { transacting: transaction });
          if (score.get("active")) {
            impactedEntryScores.push(score);
          }
        }
        if (score.get("active")) {
          ranking++;
        }

        if (triggeringEntryScore && score.get("id") === triggeringEntryScore.get("id")) {
          updatedEntryScore = score;
        }
      }
    });

    // Update high score count
    const entryDetails = entry.related<BookshelfModel>("details");
    if (entryDetails.get("high_score_count") !== scores.models.length) {
      await entryDetails.save({ high_score_count: scores.models.length }, { patch: true });
    }

    // Refresh active tournament scores
    const activeTournamentEvent = await eventTournamentService.findActiveTournamentPlaying(entry.get("id"));
    if (activeTournamentEvent) {
      const tournamentStatus = activeTournamentEvent.get("status_tournament");
      if (tournamentStatus === enums.EVENT.STATUS_TOURNAMENT.PLAYING
        || options.updateTournamentIfClosed && tournamentStatus === enums.EVENT.STATUS_TOURNAMENT.CLOSED) {
        const triggeringUserId = options.triggeringUserId || (triggeringEntryScore
          ? triggeringEntryScore.get("user_id") : null);
        eventTournamentService.refreshTournamentScores(module.exports.default, activeTournamentEvent,
          triggeringUserId, impactedEntryScores);
      }
    }

    if (updatedEntryScore) {
      await updatedEntryScore.load(["user"]);
    }
    return updatedEntryScore;
  }

  public isExternalProof(entryScore: BookshelfModel): boolean {
    return forms.isURL(entryScore.get("proof"));
  }

  private rankingDir(entry: BookshelfModel): SortOrder {
    return entry.get("status_high_score") === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? "ASC" : "DESC";
  }

  private rankingOperator(entry: BookshelfModel): string {
    return entry.get("status_high_score") === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? "<" : ">";
  }

}

export default new HighScoreService();
