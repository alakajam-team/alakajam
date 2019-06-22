import enums from "server/core/enums";
import eventService from "server/event/event.service";

/**
 * Manage user entries
 */
export async function dashboardEntries(req, res) {
  const entryCollection = await eventService.findUserEntries(res.locals.user);

  const alakajamEntries = [];
  const otherEntries = [];
  const externalEntries = [];
  entryCollection.models.forEach((entry) => {
    if (entry.get("external_event") != null) {
      externalEntries.push(entry);
    } else if (entry.related("event").get("status_theme") !== enums.EVENT.STATUS_THEME.DISABLED) {
      alakajamEntries.push(entry);
    } else {
      otherEntries.push(entry);
    }
  });

  res.render("user/dashboard/dashboard-entries", {
    alakajamEntries,
    otherEntries,
    externalEntries,
  });
}
