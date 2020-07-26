
import forms from "server/core/forms";
import security from "server/core/security";
import highScoreService from "server/entry/highscore/entry-highscore.service";
import eventService from "server/event/event.service";
import tournamentService from "server/event/tournament/tournament.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "../event.middleware";

/**
 * Manage tournament games
 */
export async function eventManageTournament(req: CustomRequest, res: CustomResponse<EventLocals>) {
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
        const entry = await eventService.findEntryById(req.body.add);
        if (entry) {
          await tournamentService.addTournamentEntry(event.get("id"), entry.get("id"));
          tournamentService.recalculateAllTournamentScores(highScoreService, event);
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
        const entry = await eventService.findEntryById(req.body.id);
        if (entry) {
          await tournamentService.saveTournamentEntryOrdering(event.get("id"), entry.get("id"), req.body.ordering);
        }
      } else {
        errorMessage = "Invalid order";
      }
    }

    // Remove from tournament
    if (req.body.remove !== undefined && forms.isId(req.body.id)) {
      const entry = await eventService.findEntryById(req.body.id);
      if (entry) {
        await tournamentService.removeTournamentEntry(event.get("id"), entry.get("id"));
        tournamentService.recalculateAllTournamentScores(highScoreService, event);
      }
    }

    // Refresh scores
    if (req.body.refresh) {
      await tournamentService.recalculateAllTournamentScores(highScoreService, event);
    }
  }

  // Load tournament entries
  res.render<EventLocals>("event/manage/event-manage-tournament", {
    ...res.locals,
    tournamentEntries: await tournamentService.findTournamentEntries(event),
    errorMessage,
  });
}
