import Bluebird from "bluebird";
import { BookshelfCollection, BookshelfModel, FetchAllOptions } from "bookshelf";
import Knex from "knex";
import db from "server/core/db";
import enums from "server/core/enums";
import * as models from "server/core/models";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import postService from "server/post/post.service";

export class TeamInviteService {

  public async findEntryInvitesForUser(
    user: User, options: FetchAllOptions & { notificationsLastRead?: boolean } = {}): Promise<BookshelfCollection> {

    let notificationsLastRead = new Date(0);
    if (options.notificationsLastRead && user.get("notifications_last_read") !== undefined) {
      notificationsLastRead = new Date(user.get("notifications_last_read"));
    }

    return models.EntryInvite
      .where("invited_user_id", user.get("id"))
      .where("created_at", ">", notificationsLastRead as any)
      .fetchAll(options) as Bluebird<BookshelfCollection>;
  }

  public async acceptInvite(user: User, entry: BookshelfModel): Promise<void> {
    // Verify we're not on a solo entry
    if (entry.get("division") === enums.DIVISION.SOLO) {
      return this.deleteInvite(user, entry);
    }

    await db.transaction(async (transaction) => {
      // Check that the invite exists
      const invite = await models.EntryInvite.where({
        entry_id: entry.get("id"),
        invited_user_id: user.get("id"),
      }).fetch({ transacting: transaction });

      if (invite) {
        // Check if the user role already exists
        let userRole = await models.UserRole.where({
          node_id: entry.get("id"),
          node_type: "entry",
          user_id: user.get("id"),
        }).fetch({ transacting: transaction });

        // Create or promote role
        if (userRole) {
          const isInviteForHigherPermission = security.getPermissionsEqualOrAbove(userRole.get("permission"))
            .includes(invite.get("permission"));
          if (isInviteForHigherPermission) {
            userRole.set("permission", invite.get("permission"));
          }
        } else {
          // Clear any other invites from the same event
          if (entry.get("event_id")) {
            const inviteIds = await transaction("entry_invite")
              .select("entry_invite.id")
              .leftJoin("entry", "entry.id", "entry_invite.entry_id")
              .where({
                "entry_invite.invited_user_id": user.get("id"),
                "entry.event_id": entry.get("event_id"),
              }) as any;
            await transaction("entry_invite")
              .whereIn("id", inviteIds.map((row) => row.id))
              .del();
          }

          userRole = new models.UserRole({
            user_id: user.get("id"),
            user_name: user.get("name"),
            user_title: user.get("title"),
            node_id: entry.get("id"),
            node_type: "entry",
            permission: invite.get("permission"),
            event_id: entry.get("event_id"),
          }) as BookshelfModel;
        }

        await postService.attachPostsToEntry(entry.get("event_id"), user.get("id"), entry.get("id"),
          { transacting: transaction });

        await userRole.save(null, { transacting: transaction });
        await this.deleteInvite(user, entry, { transacting: transaction });
      }
    });
  }

  public async deleteInvite(user: User, entry: BookshelfModel, options: { transacting?: Knex.Transaction } = {}): Promise<void> {
    let query = db.knex("entry_invite");
    if (options.transacting) {
      query = query.transacting(options.transacting);
    }
    await query.where({
      entry_id: entry.get("id"),
      invited_user_id: user.get("id"),
    })
      .del();
  }

}

export default new TeamInviteService();
