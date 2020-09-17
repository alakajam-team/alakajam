
import { BookshelfModel } from "bookshelf";
import cache from "server/core/cache";
import enums from "server/core/enums";
import forms from "server/core/forms";
import security from "server/core/security";
import settings from "server/core/settings";
import { SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, SETTING_EVENT_THEME_ELIMINATION_THRESHOLD } from "server/core/settings-keys";
import { ThemeShortlistEliminationState } from "server/entity/event-details.entity";
import eventThemeService from "server/event/theme/event-theme.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "../event.middleware";
import eventThemeShortlistService from "../theme/event-theme-shortlist.service";

/**
 * Manage the event's submitted themes
 */
export async function eventManageThemes(req: CustomRequest, res: CustomResponse<EventLocals>) {
  res.locals.pageTitle += " | Themes";

  if (!security.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  // Init context
  const event = res.locals.event;
  const shortlistCollection = await eventThemeShortlistService.findShortlist(event);
  const context: any = {
    eliminationMinNotes: await settings.findNumber(
      SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, 5),
    eliminationThreshold: await settings.findNumber(
      SETTING_EVENT_THEME_ELIMINATION_THRESHOLD, 0.58),
    shortlist: shortlistCollection.models
  };

  if (req.method === "POST") {
    if (forms.isId(req.body.id)) {
      // Apply theme changes
      const theme = await eventThemeService.findThemeById(req.body.id);
      if (theme) {
        theme.set("title", forms.sanitizeString(req.body.title));
        await theme.save();
      }

    } else if (req.body["shortlist-elimination-form"] !== undefined) {
      // Save shortlist elimination settings
      const eventDetails = event.related<BookshelfModel>("details");
      const shortlistElimination: ThemeShortlistEliminationState = {
        nextElimination: forms.parsePickerDateTime(req.body["next-elimination"])?.toISOString(),
        eliminatedCount: forms.parseInt(req.body["eliminated-count"]),
        minutesBetweenEliminations: forms.parseInt(req.body["minutes-between-eliminations"])
      };
      eventDetails.set({
        theme_page_header: forms.sanitizeMarkdown(req.body["theme-page-header"]),
        shortlist_elimination: shortlistElimination
      });
      await eventThemeShortlistService.updateShortlistAutoElimination(event);
      await eventDetails.save();
      res.locals.alerts.push({ type: "success", message: "Changes saved."});

      cache.eventsById.del(event.get("id"));
      cache.eventsByName.del(event.get("name"));

    } else if (req.body["eliminate-one"] !== undefined) {
      await eventThemeShortlistService.eliminateOneShorlistTheme(event);
      res.locals.alerts.push({ type: "success", message: "Theme successfully eliminated."});
    }
  }

  if (forms.isId(req.query.edit)) {
    // Edit theme title
    context.editTheme = await eventThemeService.findThemeById(forms.parseInt(req.query.edit));
  } else if (forms.isId(req.query.ban)) {
    // Ban theme
    const theme = await eventThemeService.findThemeById(forms.parseInt(req.query.ban));
    if (theme) {
      theme.set("status", enums.THEME.STATUS.BANNED);
      await theme.save();
    }
  } else if (forms.isId(req.query.unban)) {
    // Unban theme
    const theme = await eventThemeService.findThemeById(forms.parseInt(req.query.unban));
    if (theme) {
      theme.set("status", (event.get("status_theme") === enums.EVENT.STATUS_THEME.VOTING)
        ? enums.THEME.STATUS.ACTIVE : enums.THEME.STATUS.OUT);
      await theme.save();
    }
  }

  const themesCollection = await eventThemeService.findAllThemes(event);
  context.themes = themesCollection.models;
  context.isShortlistAutoEliminationEnabled = eventThemeShortlistService.isShortlistAutoEliminationEnabled(event);

  res.render<EventLocals>("event/manage/event-manage-themes", {
    ...res.locals,
    ...context
  });
}
