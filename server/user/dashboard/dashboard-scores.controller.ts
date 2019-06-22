import forms from "server/core/forms";
import highScoreService from "server/entry/highscore/entry-highscore.service";

/**
 * Manage user entries
 */
export async function dashboardScores(req, res) {
  const sortedBy = forms.sanitizeString(req.query.sortBy) || "updated_at";

  const userScoresCollection = await highScoreService.findUserScores(res.locals.user.get("id"), { sortBy: sortedBy });
  const activeEntriesCollection = await highScoreService.findRecentlyActiveEntries({ limit: 5 });
  const entriesLastActivity = await highScoreService.findEntriesLastActivity(
    userScoresCollection.map((entryScore) => entryScore.get("entry_id")));

  const userScores = userScoresCollection.models;
  if (sortedBy === "activity") {
    userScores.sort((score1, score2) =>
      entriesLastActivity[score2.get("entry_id")] - entriesLastActivity[score1.get("entry_id")]);
  }

  res.render("user/dashboard/dashboard-scores", {
    userScores,
    activeEntries: activeEntriesCollection.models,
    entriesLastActivity,
    sortedBy,
    medals: userScoresCollection.countBy((userScore) => userScore.get("ranking")),
  });
}
