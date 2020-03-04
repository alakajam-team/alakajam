import enums from "server/core/enums";
import highscoreService from "server/entry/highscore/entry-highscore.service";
import eventTournamentService from "server/event/tournament/tournament.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EntryLocals } from "../entry.middleware";

/**
 * Browse entry scores
 */
export async function entryHighscores(req: CustomRequest, res: CustomResponse<EntryLocals>) {
  const { user, entry } = res.locals;

  if (entry.get("status_high_score") === enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
    res.errorPage(403, "High scores are disabled on this entry");
    return;
  }

  let entryScore;
  if (user) {
    entryScore = await highscoreService.findEntryScore(user.get("id"), entry.get("id"));
  }

  res.render("entry/highscore/entry-highscores", {
    entryScore,
    highScoresCollection: await highscoreService.findHighScores(entry, { fetchAll: true }),
    tournamentEvent: await eventTournamentService.findActiveTournamentPlaying(entry.get("id")),
  });
}
