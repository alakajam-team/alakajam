export interface ThemeRatings {
  rating_elimination: number;
  rating_shortlist: number;
  normalized_score: number;
}

/**
 * Computes the rating_* and normalized_score columns of a theme, never yielding NaN.
 */
export function computeThemeRatings(notes: number, score: number): ThemeRatings {
  const safeNotes = Number.isFinite(notes) ? notes : 0;
  const safeScore = Number.isFinite(score) ? score : 0;
  const wilsonBounds = computeWilsonBounds((safeNotes + safeScore) / 2.0, safeNotes);
  return {
    rating_elimination: wilsonBounds.high,
    rating_shortlist: wilsonBounds.low,
    normalized_score: safeNotes > 0 ? safeScore / safeNotes : 0,
  };
}

/**
 * Computes the Wilson score bounds of a theme from its vote tally.
 * Always returns finite numbers (invalid or missing inputs are treated as "no votes").
 */
export function computeWilsonBounds(positive: number, total: number): { low: number; high: number } {
  if (!Number.isFinite(positive) || !Number.isFinite(total) || total <= 0) {
    return { low: 0, high: 1 };
  }
  // Equation source: http://www.evanmiller.org/how-not-to-sort-by-average-rating.html
  const z = 3.0;
  const phat = Math.min(1, Math.max(0, positive / total));
  const zsqbyn = z * z / total;
  const uncertainty = z * Math.sqrt((phat * (1 - phat) + zsqbyn / 4) / total);
  return {
    low: (phat + zsqbyn / 2 - uncertainty) / (1 + zsqbyn),
    high: (phat + zsqbyn / 2 + uncertainty) / (1 + zsqbyn),
  };
}
