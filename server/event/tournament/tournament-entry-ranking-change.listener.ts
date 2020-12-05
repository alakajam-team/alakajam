import { BookshelfModel } from "bookshelf";
import enums from "server/core/enums";
import log from "server/core/log";
import * as highscoreEvents from "server/entry/highscore/highscore.events";
import { EntryRankingChangeOptions } from "server/entry/highscore/highscore.events";
import tournamentService from "./tournament.service";

export function init(): void {

  /**
   * Refresh tournament scores when a entry sees its high score rankings change
   */
  highscoreEvents.onEntryRankingChange(async (entry: BookshelfModel, impactedEntryScores: BookshelfModel[],
                                              options: EntryRankingChangeOptions = {}): Promise<void> => {
    const activeTournamentEvent = await tournamentService.findActiveTournamentPlaying(entry.get("id"));
    if (activeTournamentEvent) {
      const tournamentStatus = activeTournamentEvent.get("status_tournament");
      if (tournamentStatus === enums.EVENT.STATUS_TOURNAMENT.PLAYING
        || options.updateTournamentIfClosed && tournamentStatus === enums.EVENT.STATUS_TOURNAMENT.CLOSED) {
        const triggeringUserId = options.triggeringUserId || (options.triggeringEntryScore
          ? options.triggeringEntryScore.get("user_id") : null);
        tournamentService.refreshTournamentScores(activeTournamentEvent, triggeringUserId, impactedEntryScores)
          .catch(e => log.error(e));
      }
    }
  });
}
