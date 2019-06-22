
import cache from "server/core/cache";
import constants from "server/core/constants";
import enums from "server/core/enums";
import fileStorage from "server/core/file-storage";
import forms from "server/core/forms";
import security from "server/core/security";
import settings from "server/core/settings";
import templating from "server/core/templating-functions";
import highScoreService from "server/entry/highscore/highscore-service";
import eventService from "server/event/event.service";
import eventRatingService from "server/event/rating/event-rating.service";
import eventThemeService from "server/event/theme/event-theme.service";
import eventTournamentService from "server/event/tournament/tournament.service";
import userService from "server/user/user.service";

export async function eventManageTemplate(req, res) {
  if (!security.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  res.render("event/manage/event-manage-template", {
    eventTemplates: (await eventService.findEventTemplates()).models,
  });
}

/**
 * Edit or create an event
 */
export async function eventManage(req, res) {
  if (!security.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  let errorMessage = res.locals.errorMessage;
  let infoMessage = "";
  let redirected = false;
  let event = res.locals.event;

  if (req.body && req.body.name && req.body.title) {
    const creation = !event;

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
    if (!errorMessage && (req.files.logo || req.body["logo-delete"])) {
      const file = req.files.logo ? req.files.logo[0] : null;
      const result = await fileStorage.savePictureToModel(event, "logo", file,
        req.body["logo-delete"], `/events/${event.get("name")}/logo`, { maxDiagonal: 1000 });
      if (result.error) {
        errorMessage = result.error;
      }
    }

    if (!errorMessage) {
      if (creation) {
        event = eventService.createEvent();
      }

      const previousName = event.get("name");
      event.set({
        title: forms.sanitizeString(req.body.title),
        name: req.body.name,
        display_dates: forms.sanitizeString(req.body["display-dates"]),
        display_theme: forms.sanitizeString(req.body["display-theme"]),
        started_at: forms.parseDateTime(req.body["started-at"]),
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
          date: forms.parseDateTime(req.body["countdown-date"]),
          phrase: forms.sanitizeString(req.body["countdown-phrase"]),
          enabled: req.body["countdown-enabled"] === "on",
        },
      });

      // Triggers
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
        eventTournamentService.recalculateAllTournamentScores(highScoreService, event);
      }

      // Caches clearing
      cache.general.del("active-tournament-event");
      const nameChanged = event.hasChanged("name");
      event = await event.save();
      cache.eventsById.del(event.get("id"));
      cache.eventsByName.del(event.get("name"));
      if (nameChanged && previousName) {
        await eventService.refreshEventReferences(event);
        cache.eventsByName.del(previousName);
      }

      // Event details update
      const eventDetails = event.related("details");
      eventDetails.set({
        links: req.body.links,
        category_titles: req.body["category-titles"],
      });
      if (req.files.banner || req.body["banner-delete"]) {
        const file = req.files.banner ? req.files.banner[0] : null;
        const result = await fileStorage.savePictureToModel(eventDetails, "banner", file,
          req.body["banner-delete"], `/events/${event.get("name")}/banner`, { maxDiagonal: 3000 });
        if (result.error) {
          errorMessage = result.error;
        }
      }
      await eventDetails.save();

      if (creation) {
        res.redirect(templating.buildUrl(event, "event", "edit"));
        redirected = true;
      }
    }
  }

  if (!redirected) {
    // Initialize event (optionally from template)
    if (!event) {
      let eventTemplate = null;
      if (forms.isId(req.query["event-template-id"])) {
        eventTemplate = await eventService.findEventTemplateById(parseInt(req.query["event-template-id"], 10));
      }
      event = eventService.createEvent(eventTemplate);
    }

    // Render
    res.render("event/manage/event-manage", {
      event,
      eventPresetsData: (await eventService.findEventPresets()).toJSON(),
      infoMessage,
      errorMessage,
    });
  }
}

/**
 * Manage the event's submitted themes
 */
export async function eventManageThemes(req, res) {
  res.locals.pageTitle += " | Themes";

  if (!security.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  // Init context
  const event = res.locals.event;
  const shortlistCollection = await eventThemeService.findShortlist(event);
  const context: any = {
    eliminationMinNotes: await settings.findNumber(
      constants.SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, 5),
    eliminationThreshold: await settings.findNumber(
      constants.SETTING_EVENT_THEME_ELIMINATION_THRESHOLD, 0.58),
    shortlist: shortlistCollection.models,
    eliminatedShortlistThemes: eventThemeService.computeEliminatedShortlistThemes(event),
  };

  if (req.method === "POST") {
    if (forms.isId(req.body.id)) {
      // Save theme title
      const theme = await eventThemeService.findThemeById(req.body.id);
      if (theme) {
        theme.set("title", forms.sanitizeString(req.body.title));
        await theme.save();
      }
    } else if (req.body.elimination) {
      // Save shortlist elimination settings
      const eventDetails = event.related("details");
      const sanitizedDelay = forms.isInt(req.body["elimination-delay"])
        ? parseInt(req.body["elimination-delay"], 10) : 8;
      eventDetails.set("shortlist_elimination", {
        start: forms.parseDateTime(req.body["elimination-start-date"]),
        delay: sanitizedDelay,
        body: forms.sanitizeMarkdown(req.body["elimination-body"]),
        stream: forms.sanitizeString(req.body.stream),
      });
      await eventDetails.save();
      cache.eventsById.del(event.get("id"));
      cache.eventsByName.del(event.get("name"));
    }
  }

  if (forms.isId(req.query.edit)) {
    // Edit theme title
    context.editTheme = await eventThemeService.findThemeById(req.query.edit);
  } else if (forms.isId(req.query.ban)) {
    // Ban theme
    const theme = await eventThemeService.findThemeById(req.query.ban);
    if (theme) {
      theme.set("status", enums.THEME.STATUS.BANNED);
      await theme.save();
    }
  } else if (forms.isId(req.query.unban)) {
    // Unban theme
    const theme = await eventThemeService.findThemeById(req.query.unban);
    if (theme) {
      theme.set("status", (event.get("status_theme") === enums.EVENT.STATUS_THEME.VOTING)
        ? enums.THEME.STATUS.ACTIVE : enums.THEME.STATUS.OUT);
      await theme.save();
    }
  }

  // Fetch themes list at the end to make sure all changes are visible
  const themesCollection = await eventThemeService.findAllThemes(event);
  context.themes = themesCollection.models;

  res.render("event/manage/event-manage-themes", context);
}

/**
 * Browse event entries
 */
export async function eventManageEntries(req, res) {
  res.locals.pageTitle += " | Entries";

  if (!security.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  const event = res.locals.event;

  // Find all entries
  const findGameOptions: any = {
    eventId: event.get("id"),
    pageSize: null,
    withRelated: ["userRoles", "details"],
  };
  if (req.query.orderBy === "ratingCount") {
    findGameOptions.sortByRatingCount = true;
  }
  const entriesCollection = await eventService.findGames(findGameOptions);

  // Gather info for karma details
  const entriesById = {};
  entriesCollection.each((entry) => {
    entriesById[entry.get("id")] = entry;
  });
  const detailedEntryInfo: any = {};
  const usersById = {};
  if (forms.isId(req.query.entryDetails) && entriesById[req.query.entryDetails]) {
    const eventUsersCollection = await userService.findUsers({ eventId: event.get("id") });
    eventUsersCollection.each((user) => {
      usersById[user.get("id")] = user;
    });

    const entry = entriesById[req.query.entryDetails];
    await entry.load(["comments", "votes"]);
    detailedEntryInfo.id = req.query.entryDetails;
    detailedEntryInfo.given = await eventRatingService.computeKarmaGivenByUserAndEntry(entry, event);
    detailedEntryInfo.received = await eventRatingService.computeKarmaReceivedByUser(entry);
    detailedEntryInfo.total = eventRatingService.computeKarma(detailedEntryInfo.received.total,
      detailedEntryInfo.given.total);
  }

  res.render("event/manage/event-manage-entries", {
    entries: entriesCollection.models,
    entriesById,
    usersById,
    detailedEntryInfo,
  });
}

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

/**
 * Delete an event
 */
export async function eventDelete(req, res) {
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
