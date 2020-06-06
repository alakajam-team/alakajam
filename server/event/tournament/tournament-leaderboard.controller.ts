import enums from "server/core/enums";
import tournamentService from "server/event/tournament/tournament.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "../event.middleware";

/**
 * View the leaderboard of a tournament
 */
export async function viewEventTournamentLeaderboard(req: CustomRequest, res: CustomResponse<EventLocals>) {
  res.locals.pageTitle += " | Leaderboard";

  const { event } = res.locals;

  const statusTournament = event.get("status_tournament");
  if (![enums.EVENT.STATUS_TOURNAMENT.PLAYING, enums.EVENT.STATUS_TOURNAMENT.CLOSED,
    enums.EVENT.STATUS_TOURNAMENT.RESULTS].includes(statusTournament)) {
    res.errorPage(404);
    return;
  }

  const tEntries = await tournamentService.findTournamentEntries(event);

  res.render("event/tournament/tournament-leaderboard", {
    tournamentScores: (await tournamentService.findTournamentScores(event)).models,
    entries: tEntries.map((tEntry) => tEntry.related("entry")),
  });
}
