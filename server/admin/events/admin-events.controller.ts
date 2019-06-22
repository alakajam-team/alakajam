import eventService from "../../event/event.service";

/**
 * Events management
 */
export async function adminEvents(req, res) {
  const eventsCollection = await eventService.findEvents();
  res.render("admin/events/admin-events", {
    events: eventsCollection.models,
  });
}
