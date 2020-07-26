import enums from "server/core/enums";
import highScoreService from "server/entry/highscore/entry-highscore.service";
import tournamentService from "server/event/tournament/tournament.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "../event.middleware";
import { BookshelfModel } from "bookshelf";
import { EventFlags } from "server/entity/event-details.entity";
import eventParticipationService from "../dashboard/event-participation.service";

/**
 * View the games of a tournament
 */
export async function viewEventTournamentGames(req: CustomRequest, res: CustomResponse<EventLocals>) {
  res.locals.pageTitle += " | Tournament games";

  const { user, event, featuredEvent } = res.locals;

  const statusTournament = event.get("status_tournament");
  if ([enums.EVENT.STATUS_TOURNAMENT.DISABLED, enums.EVENT.STATUS_TOURNAMENT.OFF].includes(statusTournament)) {
    res.errorPage(404);
    return;
  }

  const tournamentEntries = await tournamentService.findTournamentEntries(event, { withDetails: true });
  const entries = tournamentEntries.map((tEntry) => tEntry.related("entry")) as BookshelfModel[];
  const highScoresMap = await highScoreService.findHighScoresMap(entries);
  const userScoresMap = user ? await highScoreService.findUserScoresMapByEntry(user.get("id"), entries) : {};
  const tournamentScore = user ? await tournamentService.findOrCreateTournamentScore(
    event.get("id"), user.get("id")) : null;
  const activeEntries = (await highScoreService.findRecentlyActiveEntries({
    eventId: event.get("id"),
    limit: 10
  })).models;

  const eventFlags = event.related<BookshelfModel>("details").get("flags") as EventFlags;
  let streamerBadges = new Set();
  let canEnterTournament = true;
  if (eventFlags.streamerOnlyTournament && event.get("id") === featuredEvent.get("id")) {
    const streamerParticipations = await eventParticipationService.getEventParticipations(event, { filter: "streamers" });
    streamerBadges = new Set(streamerParticipations.map(ep => ep.userId));
    if (user) {
      canEnterTournament = streamerBadges.has(user.id);
    }
  }

  res.render<EventLocals>("event/tournament/tournament-games", {
    ...res.locals,
    entries,
    highScoresMap,
    userScoresMap,
    tournamentScore,
    activeEntries,
    streamerBadges,
    canEnterTournament
  });
}
