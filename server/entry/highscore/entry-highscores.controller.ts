import enums from "server/core/enums";
import highscoreService from "server/entry/highscore/entry-highscore.service";
import eventParticipationService from "server/event/dashboard/event-participation.service";
import eventService from "server/event/event.service";
import tournamentService from "server/event/tournament/tournament.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EntryLocals } from "../entry.middleware";

/**
 * Browse entry scores
 */
export async function entryHighscores(req: CustomRequest, res: CustomResponse<EntryLocals>) {
  const { user, entry, featuredEvent } = res.locals;

  if (entry.get("status_high_score") === enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
    res.errorPage(403, "High scores are disabled on this entry");
    return;
  }

  let entryScore;
  if (user) {
    entryScore = await highscoreService.findEntryScore(user.get("id"), entry.get("id"));
  }

  let streamerBadges: Set<number> = new Set();
  if (eventService.getEventFlag(featuredEvent, "streamerOnlyTournament")) {
    streamerBadges = new Set(await eventParticipationService.getStreamerIds(featuredEvent));
  }

  res.render<EntryLocals>("entry/highscore/entry-highscores", {
    ...res.locals,
    entryScore,
    highScoresCollection: await highscoreService.findHighScores(entry, { fetchAll: true }),
    tournamentEvent: await tournamentService.findActiveTournamentPlaying(entry.get("id")),
    streamerBadges
  });
}
