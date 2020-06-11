
import { BookshelfModel } from "bookshelf";
import cache from "server/core/cache";
import constants from "server/core/constants";
import enums from "server/core/enums";
import fileStorage from "server/core/file-storage";
import forms from "server/core/forms";
import links from "server/core/links";
import security from "server/core/security";
import highScoreService from "server/entry/highscore/entry-highscore.service";
import eventPresetService from "server/event/event-preset.service";
import eventService from "server/event/event.service";
import eventRatingService from "server/event/rating/event-rating.service";
import eventThemeService from "server/event/theme/event-theme.service";
import tournamentService, { CACHE_KEY_ACTIVE_TOURNAMENT_EVENT } from "server/event/tournament/tournament.service";
import { CustomRequest, CustomResponse } from "server/types";
import eventTemplateService from "../event-template.service";
import { EventLocals } from "../event.middleware";

/**
 * Edit or create an event
 */
export async function eventManage(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { user } = res.locals;
  let { event } = res.locals;

  if (!security.canUserManage(user, event) && !security.isAdmin(user)) {
    res.errorPage(403);
    return;
  }

  let errorMessage = res.locals.errorMessage;
  let infoMessage = "";
  let redirected = false;

  if (req.body && req.body.name && req.body.title) {
    const creation = !event;
    const files = req.files as Record<string, Express.Multer.File[]>;

    // TODO Fields should not be reset if validation fails
    if (!forms.isSlug(req.body.name)) {
      errorMessage = "Name is not a valid slug";
    } else if (req.body.name.indexOf("-") === -1) {
      errorMessage = "Name must contain at least one hyphen (-)";
    } else if (req.body["event-preset-id"] && !forms.isInt(req.body["event-preset-id"])) {
      errorMessage = "Invalid event preset ID";
    } else if (!forms.isIn(req.body.status, enums.EVENT.STATUS)) {
      errorMessage = "Invalid status";
    } else if (!forms.isIn(req.body["status-theme"], enums.EVENT.STATUS_THEME) &&
        !forms.isId(req.body["status-theme"])) {
      errorMessage = "Invalid theme status";
    } else if (!forms.isIn(req.body["status-entry"], enums.EVENT.STATUS_ENTRY)) {
      errorMessage = "Invalid entry status";
    } else if (!forms.isIn(req.body["status-results"], enums.EVENT.STATUS_RESULTS) &&
        !forms.isId(req.body["status-results"])) {
      errorMessage = "Invalid results status";
    } else if (!forms.isIn(req.body["status-tournament"], enums.EVENT.STATUS_TOURNAMENT)) {
      errorMessage = "Invalid tournament status";
    } else if (event) {
      const matchingEventsCollection = await eventService.findEvents({ name: req.body.name });
      for (const matchingEvent of matchingEventsCollection.models) {
        if (event.id !== matchingEvent.id) {
          errorMessage = "Another event with the same exists";
        }
      }
    }
    if (!errorMessage) {
      try {
        req.body.divisions = JSON.parse(req.body.divisions || "{}");
      } catch (e) {
        errorMessage = "Invalid divisions JSON";
      }
    }
    if (!errorMessage) {
      try {
        req.body["category-titles"] = JSON.parse(req.body["category-titles"] || "[]");
        if (req.body["category-titles"].length > constants.MAX_CATEGORY_COUNT) {
          errorMessage = "Events cannot have more than " + constants.MAX_CATEGORY_COUNT + " rating categories";
        }
      } catch (e) {
        errorMessage = "Invalid rating category JSON";
      }
    }
    if (!errorMessage) {
      try {
        req.body.links = JSON.parse(req.body.links || "[]");
      } catch (e) {
        errorMessage = "Invalid links JSON";
      }
    }
    if (!errorMessage && (files.logo || req.body["logo-delete"])) {
      const file = files.logo ? files.logo[0] : null;
      const result = await fileStorage.savePictureToModel(event, "logo", file,
        req.body["logo-delete"], `/events/${req.body.name}/logo`, { maxDiagonal: 1000 });
      if ("error" in result) {
        errorMessage = result.error;
      }
    }

    if (!errorMessage) {
      if (creation) {
        event = eventService.createEvent();
      }

      // Update event
      const previousName = event.get("name");
      event.set({
        title: forms.sanitizeString(req.body.title),
        name: req.body.name,
        display_dates: forms.sanitizeString(req.body["display-dates"]),
        display_theme: forms.sanitizeString(req.body["display-theme"]),
        started_at: forms.parsePickerDate(req.body["started-at"]),
        divisions: req.body.divisions,
        event_preset_id: req.body["event-preset-id"] || null,
        status: req.body.status,
        status_rules: req.body["status-rules"],
        status_theme: req.body["status-theme"],
        status_entry: req.body["status-entry"],
        status_results: req.body["status-results"],
        status_tournament: req.body["status-tournament"],
        countdown_config: {
          message: forms.sanitizeString(req.body["countdown-message"]),
          link: forms.sanitizeString(req.body["countdown-link"]),
          date: forms.parsePickerDateTime(req.body["countdown-date"]),
          phrase: forms.sanitizeString(req.body["countdown-phrase"]),
          enabled: req.body["countdown-enabled"] === "on",
        },
      });
      const nameChanged = event.hasChanged("name");

      // Run event triggers
      if (event.hasChanged("status_theme") && event.get("status_theme") === enums.EVENT.STATUS_THEME.SHORTLIST) {
        await eventThemeService.computeShortlist(event);
        infoMessage = "Theme shortlist computed.";
      }
      if (event.hasChanged("status_results")) {
        if (event.get("status_results") === enums.EVENT.STATUS_RESULTS.RESULTS) {
          await eventRatingService.computeRankings(event);
          infoMessage = "Event results computed.";
        } else if (event.previous("status_results") === enums.EVENT.STATUS_RESULTS.RESULTS) {
          await eventRatingService.clearRankings(event);
          infoMessage = "Event results cleared.";
        }
      }
      if (event.hasChanged("status_tournament")
          && event.previous("status_tournament") === enums.EVENT.STATUS_TOURNAMENT.OFF) {
        // Pre-fill leaderboard with people who were already in the high scores
        tournamentService.recalculateAllTournamentScores(highScoreService, event);
      }

      // Save event
      await event.save();

      // Update and save event details
      const eventDetails = event.related<BookshelfModel>("details");
      eventDetails.set({
        links: req.body.links,
        category_titles: req.body["category-titles"],
        flags: {
          streamerOnlyTournament: Boolean(req.body.streamerOnlyTournament)
        }
      });
      if (files.banner || req.body["banner-delete"]) {
        const file = files.banner ? files.banner[0] : null;
        const result = await fileStorage.savePictureToModel(eventDetails, "banner", file,
          req.body["banner-delete"], `/events/${event.get("name")}/banner`, { maxDiagonal: 3000 });
        if ("error" in result) {
          errorMessage = result.error;
        }
      }
      if (files.background || req.body["background-delete"]) {
        const file = files.background ? files.background[0] : null;
        const result = await fileStorage.savePictureToModel(eventDetails, "background", file,
          req.body["background-delete"], `/events/${event.get("name")}/background`, { maxDiagonal: 3000 });
        if ("error" in result) {
          errorMessage = result.error;
        }
      }
      await eventDetails.save();

      // Caches clearing
      cache.general.del(CACHE_KEY_ACTIVE_TOURNAMENT_EVENT);
      cache.eventsById.del(event.get("id"));
      cache.eventsByName.del(event.get("name"));
      if (nameChanged && previousName) {
        await eventService.refreshEventReferences(event);
        cache.eventsByName.del(previousName);
      }

      if (creation) {
        res.redirect(links.routeUrl(event, "event", "edit"));
        redirected = true;
      }
    }
  }

  if (!redirected) {
    // Initialize event (optionally from template)
    if (!event) {
      let eventTemplate = null;
      if (forms.isId(req.query["event-template-id"])) {
        eventTemplate = await eventTemplateService.findEventTemplateById(parseInt(req.query["event-template-id"], 10));
      }
      event = eventService.createEvent(eventTemplate);
    }

    // Render
    res.render("event/manage/event-manage", {
      event,
      eventPresetsData: (await eventPresetService.findEventPresets()).toJSON(),
      infoMessage,
      errorMessage,
    });
  }
}

/**
 * Delete an event
 */
export async function eventDelete(req: CustomRequest, res: CustomResponse<EventLocals>) {
  if (!security.isAdmin(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  if (res.locals.event.get("status") === enums.EVENT.STATUS.PENDING) {
    await res.locals.event.destroy();
    res.redirect("/events");
  } else {
    res.errorPage(403, "Only pending events can be deleted");
  }
}
