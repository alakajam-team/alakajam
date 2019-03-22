
/**
 * Notification service.
 *
 * @module services/notification-service
 */

import cache from "../core/cache";
import eventService from "../services/event-service";
import postService from "../services/post-service";

export default {
  countUnreadNotifications,
};

async function countUnreadNotifications(user) {
  const userCache = cache.user(user);
  let unreadNotifications = userCache.get("unreadNotifications");
  if (unreadNotifications === undefined) {
    const commentsCollection = await postService.findCommentsToUser(user, { notificationsLastRead: true });
    const invitesCollection = await eventService.findEntryInvitesForUser(user, { notificationsLastRead: true });
    unreadNotifications = commentsCollection.length + invitesCollection.length;
    userCache.set("unreadNotifications", unreadNotifications);
  }
  return unreadNotifications;
}
