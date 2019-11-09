
import cache from "server/core/cache";
import constants from "server/core/constants";
import enums from "server/core/enums";
import forms from "server/core/forms";
import security from "server/core/security";
import settings from "server/core/settings";
import eventThemeService from "server/event/theme/event-theme.service";

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
        start: forms.parsePickerDateTime(req.body["elimination-start-date"]),
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
