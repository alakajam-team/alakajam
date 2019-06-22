
import forms from "server/core/forms";
import security from "server/core/security";
import highScoreService from "server/entry/highscore/entry-highscore.service";
import eventService from "server/event/event.service";
import eventTournamentService from "server/event/tournament/tournament.service";

/**
 * Manage tournament games
 */
export async function eventManageTournament(req, res) {
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
          await eventTournamentService.addTournamentEntry(event.get("id"), entry.get("id"));
          eventTournamentService.recalculateAllTournamentScores(highScoreService, event, [entry]);
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
          await eventTournamentService.saveTournamentEntryOrdering(event.get("id"), entry.get("id"), req.body.ordering);
        }
      } else {
        errorMessage = "Invalid order";
      }
    }

    // Remove from tournament
    if (req.body.remove !== undefined && forms.isId(req.body.id)) {
      const entry = await eventService.findEntryById(req.body.id);
      if (entry) {
        await eventTournamentService.removeTournamentEntry(event.get("id"), entry.get("id"));
        eventTournamentService.recalculateAllTournamentScores(highScoreService, event, [entry]);
      }
    }

    // Refresh scores
    if (req.body.refresh || req.body["refresh-all"]) {
      const onlyRefreshEntries = (!req.body["refresh-all"] && forms.isId(req.body.refresh))
        ? [await eventService.findEntryById(req.body.id)] : null;
      await eventTournamentService.recalculateAllTournamentScores(highScoreService, event, onlyRefreshEntries);
    }
  }

  // Load tournament entries
  res.render("event/manage/event-manage-tournament", {
    tournamentEntries: await eventTournamentService.findTournamentEntries(event),
    errorMessage,
  });
}
