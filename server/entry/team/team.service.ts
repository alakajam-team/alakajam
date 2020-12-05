import { BookshelfCollection, BookshelfModel, EntryBookshelfModel } from "bookshelf";
import cache from "server/core/cache";
import { ilikeOperator } from "server/core/config";
import db from "server/core/db";
import enums from "server/core/enums";
import * as models from "server/core/models";
import { SECURITY_PERMISSION_MANAGE, SECURITY_PERMISSION_WRITE } from "server/core/security";
import { User } from "server/entity/user.entity";
import teamInviteService from "./team-invite.service";

export interface TeamMember {
  id: number;
  text: string;
  avatar: string;
  locked: boolean;
  invite: boolean;
}

export class TeamService {

  /**
   * Search for potential team members by name.
   * @param {string} nameFragment the name search string.
   * @param {number} eventId the event ID (optional, null if an external event).
   * @param {Entry} entry the entry model (optional, null if we're in a creation).
   * @returns {TeamMemberSearchResult[]}
   */
  public searchForTeamMembers(nameFragment: string, eventId?: number, entry?: BookshelfModel): Promise<TeamMemberSearchResult[]> {
    // As SQL:
    // SELECT "user".name, "user".title, entered.node_id
    // FROM "user"
    // LEFT JOIN (
    //   SELECT user_id, event_id, node_type FROM user_role
    //   WHERE node_type = 'entry' AND event_id = ${eventId}
    // ) entered
    // ON "user".id = entered.user_id;

    const alreadyEnteredWhereClause: any = {
      node_type: "entry",
    };
    if (eventId) {
      // general case: detect people who entered in the same event
      alreadyEnteredWhereClause.event_id = eventId;
    } else {
      // external entries: detect people in the same entry
      // (or everyone if the entry is not created yet)
      alreadyEnteredWhereClause.node_id = entry ? entry.get("id") : -1;
    }

    const alreadyEntered = db.knex("user_role")
      .select("user_id", "event_id", "node_id")
      .where(alreadyEnteredWhereClause);

    return db.knex
      .select("user.id", "user.title", "user.avatar", "entered.node_id")
      .from("user")
      .leftJoin(alreadyEntered.as("entered"), "user.id", "=", "entered.user_id")
      .where("name", ilikeOperator(), `%${nameFragment}%`);
  }

  public async findTeamMembers(entry: EntryBookshelfModel, user?: User): Promise<TeamMember[]> {
    if (entry && entry.get("id")) {
      await entry.load(["invites.invited", "userRoles.user"]);
      const members = entry.sortedUserRoles()
        .map((role) => ({
          id: role.get("user_id"),
          text: role.get("user_title") || role.get("user_name"),
          avatar: role.related("user").get("avatar"),
          locked: role.get("permission") === SECURITY_PERMISSION_MANAGE,
          invite: false,
        }));

      entry.related<BookshelfCollection>("invites").forEach((invite) => {
        members.push({
          id: invite.get("invited_user_id"),
          text: invite.get("invited_user_title"),
          avatar: invite.related("invited").get("avatar"),
          locked: false,
          invite: true,
        });
      });
      return members;
    } else {
      // New entry: only the current user is a member
      return [{
        id: user.get("id"),
        text: user.get("title"),
        avatar: user.get("avatar"),
        locked: true,
        invite: false,
      }];
    }
  }

  /**
   * Sets the team members of an entry.
   * @param {Bookshelf.Model} currentUser the current user model.
   * @param {Bookshelf.Model} entry the entry model.
   * @param {string[]} userIds the desired member user IDs.
   */
  public setTeamMembers(currentUser: User, entry: EntryBookshelfModel, userIds: string[]): Promise<SetTeamMembersResult> {
    return db.transaction(async (transaction) => {
      let numRemoved = 0;
      let numAdded = 0;
      let alreadyEntered = [];
      const entryId = entry.get("id");

      if (entry.get("division") === enums.DIVISION.SOLO) {
        // Force only keeping the owner role
        numRemoved = await transaction("user_role")
          .whereNot("permission", SECURITY_PERMISSION_MANAGE)
          .andWhere({
            node_type: "entry",
            node_id: entryId,
          })
          .del();

        // Delete any pending invites
        await transaction("entry_invite")
          .where("entry_id", entryId)
          .del();
      } else {
        // Remove removed user posts from the entry
        await entry.load("posts", { transacting: transaction });
        entry.related<BookshelfCollection>("posts").forEach(async (post) => {
          if (!userIds.includes(post.get("author_user_id"))) {
            post.set("entry_id", null);
            await post.save(null, { transacting: transaction });
          }
        });

        // Remove users not in team list.
        numRemoved = await transaction("user_role")
          .whereNotIn("user_id", userIds)
          .andWhere({
            node_type: "entry",
            node_id: entryId,
          })
          .del();

        // Remove invites not in team list
        numRemoved += await transaction("entry_invite")
          .whereNotIn("invited_user_id", userIds)
          .andWhere("entry_id", entryId)
          .del();

        // List users who entered the event in this or another team, or already have an invite.
        const existingRolesQuery = transaction("user_role")
          .select("user_id", "user_title", "node_id")
          .whereIn("user_id", userIds);
        if (entry.get("event_id")) {
          alreadyEntered = await existingRolesQuery.andWhere({
            node_type: "entry",
            event_id: entry.get("event_id"),
          });
        } else {
          alreadyEntered = await existingRolesQuery.andWhere({
            node_type: "entry",
            node_id: entryId,
          });
        }
        if (entry.get("id")) {
          const pendingInvites = await transaction("entry_invite")
            .select("invited_user_id", "invited_user_title")
            .whereIn("invited_user_id", userIds)
            .where("entry_id", entry.get("id"));
          pendingInvites.map((pendingInvite) => {
            alreadyEntered.push({
              user_id: pendingInvite.invited_user_id,
              user_title: pendingInvite.invited_user_title,
              node_id: entry.get("id"),
            });
          });
        }

        // Remove names of users who are already entered.
        const enteredUserIds = alreadyEntered.map((obj) => obj.user_id);
        userIds = userIds.filter((userId) => !enteredUserIds.includes(userId));

        // Create invites for all remaining named users.
        // (accept it directly if we're setting the current user)
        const toCreateUserData = await transaction("user")
          .select("id", "name", "title")
          .whereIn("id", userIds);
        for (const toCreateUserRow of toCreateUserData) {
          const invite = new models.EntryInvite({
            entry_id: entryId,
            invited_user_id: toCreateUserRow.id,
            invited_user_title: toCreateUserRow.title || toCreateUserRow.name,
            permission: SECURITY_PERMISSION_WRITE,
          });
          await invite.save(null, { transacting: transaction });

          if (toCreateUserRow.id === currentUser.get("id")) {
            await teamInviteService.acceptInvite(currentUser, entry);
          } else {
            numAdded++;
            cache.user(toCreateUserRow.name).del("unreadNotifications");
          }
        }
      }

      return {
        numRemoved,
        numAdded,
        alreadyEntered,
      };
    });
  }

}

export default new TeamService();

interface TeamMemberSearchResult {
  /** User ID */
  id: number;
  /** User title */
  title: string;
  /** User avatar path */
  avatar?: string;
  /** The entry ID if entered, otherwise `null` */
  node_id: number | null;
  /** the event ID if entered; otherwise `null` */
  event_id: number | null;
}

interface UserEntryData {
  /** The user ID */
  user_id: string;
  /** The user's title */
  user_title: string;
  /** The ID of the user's entry */
  node_id: number;
}

interface SetTeamMembersResult {
  /** The number of removed user roles. */
  numRemoved: number;
  /** The number of added user roles */
  numAdded: number;
  /* Details of users already entered */
  alreadyEntered: UserEntryData[];
}
