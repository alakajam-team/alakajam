
/**
 * Notification service.
 *
 * @module services/notification-service
 */

import cache from "server/core/cache";
import eventService from "server/event/event.service";
import commentService from "server/post/comment/comment.service";

export default {
  countUnreadNotifications,
};

async function countUnreadNotifications(user) {
  const userCache = cache.user(user);
  let unreadNotifications = userCache.get("unreadNotifications");
  if (unreadNotifications === undefined) {
    const commentsCollection = await commentService.findCommentsToUser(user, { notificationsLastRead: true });
    const invitesCollection = await eventService.findEntryInvitesForUser(user, { notificationsLastRead: true });
    unreadNotifications = commentsCollection.length + invitesCollection.length;
    userCache.set("unreadNotifications", unreadNotifications);
  }
  return unreadNotifications;
}
