/* eslint-disable no-unused-expressions */

import { BookshelfModel, EntryBookshelfModel } from "bookshelf";
import { expect } from "chai";
import "module-alias/register";
import { createLuxonDate } from "server/core/formats";
import * as models from "server/core/models";
import entryHotnessService from "./entry-hotness.service";

const ONE_CATEGORY = 1;
const TWO_CATEGORIES = 2;

describe("Entry hotness service", function() {

  describe("computeHotness", () => {

    it("should make higher ranked games hotter", async () => {
      const event = fakeEvent("2020 Event", ONE_CATEGORY, { solo: 5 }, "01-2020");
      const entry1 = fakeEntry("Game 1", "solo", [1]);
      const entry2 = fakeEntry("Game 2", "solo", [2]);

      const hotnessEntry1 = await entryHotnessService.computeHotness(entry1, event);
      const hotnessEntry2 = await entryHotnessService.computeHotness(entry2, event);
      expect(hotnessEntry1).to.be.greaterThan(hotnessEntry2);
    });

    it("should make overall winner hotter than other category winners", async () => {
      const event = fakeEvent("2020 Event", TWO_CATEGORIES, { solo: 100 }, "01-2020");
      const entry1 = fakeEntry("Game 1", "solo", [1, 100]);
      const entry2 = fakeEntry("Game 2", "solo", [100, 1]);

      const hotnessEntry1 = await entryHotnessService.computeHotness(entry1, event);
      const hotnessEntry2 = await entryHotnessService.computeHotness(entry2, event);
      expect(hotnessEntry1).to.be.greaterThan(hotnessEntry2);
    });

    it("should make recent event winners hotter", async () => {
      const event2019 = fakeEvent("2019 Event", ONE_CATEGORY, { solo: 100 }, "01-2019");
      const event2020 = fakeEvent("2020 Event", ONE_CATEGORY, { solo: 100 }, "01-2020");
      const entry2019 = fakeEntry("Winner 2019", "solo", [1]);
      const entry2020 = fakeEntry("Winner 2020", "solo", [1]);

      const hotnessEntry2019 = await entryHotnessService.computeHotness(entry2019, event2019);
      // log.debug(entry2019.get("title") + " gets " + hotnessEntry2019);
      const hotnessEntry2020 = await entryHotnessService.computeHotness(entry2020, event2020);
      // log.debug(entry2020.get("title") + " gets " + hotnessEntry2020);
      expect(hotnessEntry2020).to.be.greaterThan(hotnessEntry2019);
    });

    it("should make winner of big jam hotter than winner of small jam", async () => {
      const eventSmall = fakeEvent("Small Event", ONE_CATEGORY, { solo: 10 }, "01-2020");
      const eventBig = fakeEvent("Big Event", ONE_CATEGORY, { solo: 100 }, "01-2020");
      const entrySmall = fakeEntry("Small Winner", "solo", [1]);
      const entryBig = fakeEntry("Big Winner", "solo", [1]);

      const hotnessEntrySmall = await entryHotnessService.computeHotness(entrySmall, eventSmall);
      const hotnessEntryBig = await entryHotnessService.computeHotness(entryBig, eventBig);
      expect(hotnessEntryBig).to.be.greaterThan(hotnessEntrySmall);
    });

    it("should keep last jam winner hotter than recent loser", async () => {
      const event7 = fakeEvent("7th Alakajam", ONE_CATEGORY, { solo: 50 }, "10-2019");
      const event8 = fakeEvent("8th Alakajam", ONE_CATEGORY, { solo: 50 }, "02-2020");
      const entry7 = fakeEntry("Winner 7th", "solo", [1]);
      const entry8 = fakeEntry("Loser 8th", "solo", [40]);

      const hotness7winner = await entryHotnessService.computeHotness(entry7, event7);
      const hotness8loser = await entryHotnessService.computeHotness(entry8, event8);
      expect(hotness7winner).to.be.greaterThan(hotness8loser);
    });

  });

});

function fakeEntry(title: string, division: string, rankings: number[]): EntryBookshelfModel {
  const entryDetails = new models.EntryDetails();
  rankings.forEach((ranking, index) => {
    entryDetails.set(`ranking_${index}`, ranking);
  });

  const entry = new models.Entry({
    title,
    division
  }) as EntryBookshelfModel;
  entry.relations.details = entryDetails;
  entry.related = () => entryDetails;
  return entry;
}

function fakeEvent(title: string, categoryCount: number, divisionCounts: Record<string, number>, startTime: string): BookshelfModel {
  const eventDetails = new models.EventDetails({
    category_titles: new Array(categoryCount),
    division_counts: divisionCounts
  });

  const event = new models.Event({
    title,
    started_at: createLuxonDate(startTime, {}, "MM-y").toJSDate()
  }) as BookshelfModel;
  event.relations.details = eventDetails;
  event.related = () => eventDetails;
  return event;
}
