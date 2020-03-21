import { BookshelfCollectionOf, BookshelfModel, EntryBookshelfModel } from "bookshelf";
import db from "server/core/db";
import eventService from "server/event/event.service";

const MILLISECONDS_TO_DAYS = 1. / 1000 / 3600 / 24;
const OVERALL_CATEGORY_WEIGHT_BONUS = 3.;
const HOTNESS_AGING_SPEED = 5000.;

export class EntryHotnessService {

  public async refreshEntriesHotness(event: BookshelfModel): Promise<void> {
    return db.transaction(async (t) => {
      const entryCollection = await eventService.findGames({
        eventId: event.get("id"),
        withRelated: ["details"],
        pageSize: null
      }) as BookshelfCollectionOf<EntryBookshelfModel>;

      for (const entry of entryCollection.models) {
        const entryHotness = await this.computeHotness(entry, event);
        await entry.save("hotness", entryHotness, { transacting: t });
      }
    });
  }

  /**
   * Compute the game hotness according to:
   * - The event date
   * - How well the game was ranked in the various categories
   * - How many games there were in the event
   * Inspired by the Reddit post sorting algorithm.
   */
  public async computeHotness(entry: EntryBookshelfModel, event: BookshelfModel): Promise<number> {
    if (!entry.relations.details) { await entry.load("details"); };
    if (!event.relations.details) { await event.load("details"); };

    const eventDetails = event.related<BookshelfModel>("details");
    const successScore = this.getSuccessScore(entry, eventDetails);
    const bonusMalusSign = successScore >= 0.5 ? 1 : -1;
    const eventStartedAt = event.get("started_at") as Date;
    return Math.log10(successScore + 0.01)
      + bonusMalusSign * eventStartedAt.getTime() * MILLISECONDS_TO_DAYS / HOTNESS_AGING_SPEED;
  }

  /**
   * Returns entry "success" taking account all category rankings, as a number between 0 and 1
   */
  private getSuccessScore(entry: BookshelfModel, eventDetails: BookshelfModel): number {
    const categoryCount = eventDetails.get("category_titles").length;
    if (categoryCount > 0) {
      const hotnessByCategory: number[] = [];
      for (let categoryIndex = 0; categoryIndex < categoryCount; categoryIndex++) {
        const rankingPercentage = this.getRankingPercentage(entry, eventDetails, categoryIndex);
        hotnessByCategory.push(1 - rankingPercentage);
      }
      const reduceToSum = (acc: number, value: number) => acc + value;
      const hotnessSum = hotnessByCategory.reduce(reduceToSum, 0);

      // Grant more weight to the first category (usually Overall) and return the average
      return (hotnessSum + hotnessByCategory[0] * OVERALL_CATEGORY_WEIGHT_BONUS) / (categoryCount + OVERALL_CATEGORY_WEIGHT_BONUS);
    } else {
      return .5;
    }
  }

  /**
   * Returns how successful a game was within its division (close to 0 = first, 1 = last)
   */
  private getRankingPercentage(entry: BookshelfModel, eventDetails: BookshelfModel, categoryIndex: number) {
    const ranking = entry.related("details").get(`ranking_${categoryIndex}`);
    const entryCount = eventDetails.get("division_counts")[entry.get("division")];
    if (ranking && entryCount) {
      return (ranking - 1.) / entryCount;
    } else {
      return .5;
    }
  }

}

export default new EntryHotnessService();
