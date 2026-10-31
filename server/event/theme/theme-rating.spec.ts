import { describe, expect, it } from "vitest";
import { computeThemeRatings, computeWilsonBounds } from "./theme-rating";

function expectAllFinite(values: Record<string, number>) {
  for (const [key, value] of Object.entries(values)) {
    expect(Number.isFinite(value), key).toBe(true);
  }
}

describe("theme ratings", () => {
  it("computes Wilson bounds for a regular tally", () => {
    const { low, high } = computeWilsonBounds(8, 10);
    expect(low).toBeGreaterThan(0);
    expect(low).toBeLessThan(0.8);
    expect(high).toBeGreaterThan(0.8);
    expect(high).toBeLessThanOrEqual(1);
  });

  it("never yields NaN when there are no notes", () => {
    const ratings = computeThemeRatings(0, 0);
    expectAllFinite({ ...ratings });
    expect(ratings).toEqual({ rating_elimination: 1, rating_shortlist: 0, normalized_score: 0 });
  });

  it("never yields NaN on null/undefined/NaN inputs", () => {
    for (const bad of [null, undefined, NaN]) {
      expectAllFinite({ ...computeThemeRatings(bad as number, bad as number) });
      expectAllFinite({ ...computeThemeRatings(5, bad as number) });
    }
  });

  it("never yields NaN on inconsistent tallies (score beyond notes)", () => {
    expectAllFinite({ ...computeThemeRatings(3, 7) });
    expectAllFinite({ ...computeThemeRatings(3, -7) });
  });
});
