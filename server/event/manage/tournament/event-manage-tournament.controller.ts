
import forms from "server/core/forms";
import security from "server/core/security";
import entryService from "server/entry/entry.service";
import highScoreService from "server/entry/highscore/highscore.service";
import tournamentService from "server/event/tournament/tournament.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "../../event.middleware";

/**
 * Manage tournament games
 */
export async function eventManageTournament(req: CustomRequest, res: CustomResponse<EventLocals>): Promise<void> {
  res.locals.pageTitle += " | Tournament games";

  const { user, event } = res.locals;

  if (!security.isMod(user)) {
    res.errorPage(403);
    return;
  }

  let errorMessage;
  if (req.method === "POST") {
    // Add to tournament
    if (req.body.add !== undefined) {
      if (forms.isId(req.body.add)) {
        const entry = await entryService.findEntryById(req.body.add);
        if (entry) {
          await tournamentService.addTournamentEntry(event.get("id"), entry.get("id"));
          await tournamentService.recalculateAllTournamentScores(event);
        } else {
          errorMessage = "Entry not found with ID " + req.body.add;
        }
      } else {
        errorMessage = "Invalid entry ID";
      }
    }

    // Update order
    if (req.body.update !== undefined && forms.isId(req.body.id)) {
      if (forms.isInt(req.body.ordering)) {
        const entry = await entryService.findEntryById(req.body.id);
        if (entry) {
          await tournamentService.saveTournamentEntryOrdering(event.get("id"), entry.get("id"), req.body.ordering);
        }
      } else {
        errorMessage = "Invalid order";
      }
    }

    // Remove from tournament
    if (req.body.remove !== undefined && forms.isId(req.body.id)) {
      const entry = await entryService.findEntryById(req.body.id);
      if (entry) {
        await tournamentService.removeTournamentEntry(event.get("id"), entry.get("id"));
        await tournamentService.recalculateAllTournamentScores(event);
      }
    }

    // Refresh scores
    if (req.body.refresh) {
      await tournamentService.recalculateAllTournamentScores(event);
    }
  }

  // Load tournament entries
  res.render<EventLocals>("event/manage/tournament/event-manage-tournament", {
    ...res.locals,
    tournamentEntries: await tournamentService.findTournamentEntries(event),
    errorMessage,
  });
}
