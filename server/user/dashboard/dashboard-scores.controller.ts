import forms from "server/core/forms";
import highScoreService from "server/entry/highscore/entry-highscore.service";
import { CustomRequest, CustomResponse } from "server/types";
import { DashboardLocals } from "./dashboard.middleware";

/**
 * Personal high score dashboard
 */
export async function dashboardScores(req: CustomRequest, res: CustomResponse<DashboardLocals>) {
  const sortBy: string = forms.sanitizeString(req.query.sortBy?.toString()) || "submitted_at";

  const userScoresCollection = await highScoreService.findUserScores(res.locals.user.get("id"), { sortBy });
  const activeEntriesCollection = await highScoreService.findRecentlyActiveEntries({ limit: 5 });
  const entriesLastActivity = await highScoreService.findEntriesLastActivity(
    userScoresCollection.map((entryScore) => entryScore.get("entry_id")));

  const userScores = userScoresCollection.models;
  if (sortBy === "activity") {
    userScores.sort((score1, score2) =>
      entriesLastActivity[score2.get("entry_id")].getTime() - entriesLastActivity[score1.get("entry_id")].getTime());
  }

  res.render<DashboardLocals>("user/dashboard/dashboard-scores", {
    ...res.locals,
    userScores,
    activeEntries: activeEntriesCollection.models,
    entriesLastActivity,
    sortBy,
    medals: userScoresCollection.countBy((userScore) => userScore.get("ranking")),
  });
}
