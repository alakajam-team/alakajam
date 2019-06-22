import enums from "server/core/enums";
import eventTournamentService from "server/event/tournament/tournament.service";

/**
 * View the leaderboard of a tournament
 */
export async function viewEventTournamentLeaderboard(req, res) {
  res.locals.pageTitle += " | Leaderboard";

  const { event } = res.locals;

  const statusTournament = event.get("status_tournament");
  if (![enums.EVENT.STATUS_TOURNAMENT.PLAYING, enums.EVENT.STATUS_TOURNAMENT.CLOSED,
    enums.EVENT.STATUS_TOURNAMENT.RESULTS].includes(statusTournament)) {
    res.errorPage(404);
    return;
  }

  const tEntries = await eventTournamentService.findTournamentEntries(event);

  res.render("event/tournament/tournament-leaderboard", {
    tournamentScores: (await eventTournamentService.findTournamentScores(event)).models,
    entries: tEntries.map((tEntry) => tEntry.related("entry")),
  });
}
