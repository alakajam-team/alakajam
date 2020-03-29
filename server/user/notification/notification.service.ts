import cache from "server/core/cache";
import { User } from "server/entity/user.entity";
import eventService from "server/event/event.service";
import commentService from "server/post/comment/comment.service";

export class NotificationService {

  public async countUnreadNotifications(user: User): Promise<number> {
    const userCache = cache.user(user);
    let unreadNotifications = userCache.get<number>("unreadNotifications");
    if (unreadNotifications === undefined) {
      const commentsCollection = await commentService.findCommentsToUser(user, { notificationsLastRead: true });
      const invitesCollection = await eventService.findEntryInvitesForUser(user, { notificationsLastRead: true });
      unreadNotifications = commentsCollection.length + invitesCollection.length;
      userCache.set("unreadNotifications", unreadNotifications);
    }
    return unreadNotifications;
  }

}

export default new NotificationService();
