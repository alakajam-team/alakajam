import { BookshelfCollection, BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import cache from "server/core/cache";
import entryService from "server/entry/entry.service";
import teamInviteService from "server/entry/team/team-invite.service";
import commentService from "server/post/comment/comment.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "../../user.service";
import { DashboardLocals } from "../dashboard.middleware";

/**
 * View comment feed
 */
export async function dashboardFeed(req: CustomRequest, res: CustomResponse<DashboardLocals>): Promise<void> {
  const dashboardUser = res.locals.dashboardUser;

  // if an entry is not in the cache it will return undefined
  const userCache = cache.user(dashboardUser.get("name"));
  let byUserCollection = userCache.get<BookshelfCollection>("byUserCollection");
  let toUserCollection = userCache.get<BookshelfCollection>("toUserCollection");
  let latestEntry = userCache.get<BookshelfModel>("latestEntry");
  let latestPostsCollection = userCache.get<BookshelfCollection>("latestPostsCollection");

  if (!byUserCollection) {
    byUserCollection = await commentService.findCommentsByUser(dashboardUser);
    userCache.set("byUserCollection", byUserCollection);
  }
  if (!toUserCollection) {
    toUserCollection = await commentService.findCommentsToUser(dashboardUser);
    userCache.set("toUserCollection", toUserCollection);
  }
  if (!latestEntry) {
    latestEntry = await entryService.findLatestUserEntry(dashboardUser);
    userCache.set("latestEntry", latestEntry);
  }
  if (!latestPostsCollection) {
    latestPostsCollection = await postService.findPosts({
      userId: dashboardUser.id,
    });
    userCache.set("latestPostsCollection", latestPostsCollection);
  }
  const invitesCollection = await teamInviteService.findEntryInvitesForUser(dashboardUser, {
    withRelated: ["entry.event", "entry.userRoles", "invited"],
  });

  const notificationsLastRead = dashboardUser.get("notifications_last_read");
  if (!res.locals.dashboardAdminMode) {
    dashboardUser.set("notifications_last_read", new Date());
    await userService.save(dashboardUser);
    userCache.del("unreadNotifications");
    (res.locals as any).unreadNotifications = 0;
  }

  // TODO Limit at the SQL-level
  res.render<CommonLocals>("user/dashboard/feed/dashboard-feed", {
    ...res.locals,
    byUser: byUserCollection.slice(0, 20),
    toUser: toUserCollection.slice(0, 20),
    latestEntry,
    latestPosts: latestPostsCollection.slice(0, 3),
    invites: invitesCollection.models,
    notificationsLastRead,
  });
}
