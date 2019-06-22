import forms from "server/core/forms";
import templating from "server/core/templating-functions";
import eventService from "server/event/event.service";

/**
 * Fetches the current entry & event
 */
export async function entryMiddleware(req, res, next) {
  const entry = await eventService.findEntryById(req.params.entryId);
  if (!entry) {
    res.errorPage(404, "Entry not found");
    return;
  }
  res.locals.entry = entry;
  res.locals.pageTitle = entry.get("title");
  res.locals.pageDescription = entry.get("description") || forms.markdownToText(entry.related("details").get("body"));
  if (entry.picturePreviews().length > 0) {
    res.locals.pageImage = templating.staticUrl(entry.picturePreviews()[0]);
  }

  if (req.params.eventName !== "external-entry" &&
      (req.params.eventName !== entry.get("event_name") || req.params.entryName !== entry.get("name"))) {
    res.redirect(templating.buildUrl(entry, "entry", req.params.rest));
    return;
  }

  next();
}
