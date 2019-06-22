import enums from "server/core/enums";
import highScoreService from "server/entry/highscore/entry-highscore.service";
import eventTournamentService from "server/event/tournament/tournament.service";

/**
 * View the games of a tournament
 */
export async function viewEventTournamentGames(req, res) {
  res.locals.pageTitle += " | Tournament games";

  const { user, event } = res.locals;

  const statusTournament = event.get("status_tournament");
  if ([enums.EVENT.STATUS_TOURNAMENT.DISABLED, enums.EVENT.STATUS_TOURNAMENT.OFF].includes(statusTournament)) {
    res.errorPage(404);
    return;
  }

  const tournamentEntries = await eventTournamentService.findTournamentEntries(event, { withDetails: true });
  const entries = tournamentEntries.map((tEntry) => tEntry.related("entry"));
  const highScoresMap = await highScoreService.findHighScoresMap(entries);
  const userScoresMap = user ? await highScoreService.findUserScoresMapByEntry(user.get("id"), entries) : {};
  const tournamentScore = user ? await eventTournamentService.findOrCreateTournamentScore(
    event.get("id"), user.get("id")) : null;
  const activeEntries = (await highScoreService.findRecentlyActiveEntries({
      eventId: event.get("id"),
      limit: 10
    })).models;

  res.render("event/tournament/tournament-games", {
    entries,
    highScoresMap,
    userScoresMap,
    tournamentScore,
    activeEntries
  });
}
