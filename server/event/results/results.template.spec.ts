import { describe, it } from "vitest";
import { expect } from "chai";
import { getVisibleCategories } from "./results.template";

describe("Results template", () => {

  describe("visible categories", () => {

    const titles = ["Overall", "Fun", "Graphics", "Audio", "Humor", "Mood", "Innovation", "Special"];

    function mockEntry(ratings: Record<number, number>) {
      return { related: () => ({ get: (key: string) => ratings[parseInt(key.replace("rating_", ""), 10)] }) } as any;
    }

    it("should hide categories in which no entry was rated (#605)", () => {
      const rankings = [mockEntry({ 1: 4, 2: 3 }), mockEntry({ 1: 2, 2: 1 })];

      expect(getVisibleCategories(rankings, titles, false, 1)).to.deep.equal([1, 2]);
    });

    it("should always keep the category the table is sorted by", () => {
      const rankings = [mockEntry({ 1: 4 })];

      expect(getVisibleCategories(rankings, titles, false, 3)).to.deep.equal([1, 3]);
    });

    it("should hide the special awards category when enabled", () => {
      const rankings = [mockEntry({ 1: 4, 7: 5 })];

      expect(getVisibleCategories(rankings, titles, true, 1)).to.deep.equal([1]);
    });

  });
});
