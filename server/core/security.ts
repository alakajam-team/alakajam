
/**
 * Security service. Helps with checking permissions.
 */

import { BookshelfCollection, BookshelfModel } from "bookshelf";
import { User } from "server/entity/user.entity";
import enums from "./enums";
import * as models from "./models";

export const SECURITY_PERMISSION_READ = "read";
export const SECURITY_PERMISSION_WATCH = "watch";
export const SECURITY_PERMISSION_WRITE = "write";
export const SECURITY_PERMISSION_MANAGE = "manage";

export type SecurityPermission = "read" | "watch" | "write" | "manage";

export interface SecurityOptions {
  allowMods?: boolean;
  allowAdmins?: boolean;
}

export class Security {

  private readonly ORDERED_PERMISSIONS: SecurityPermission[] = ["read", "watch", "write", "manage"];

  /**
   * Checks if a user is watching the given model for receiving notifications
   */
  public isUserWatching(user: User, model: BookshelfModel): boolean {
    return this.canUser(user, model, "watch");
  }

  public canUserRead(user: User, model: BookshelfModel, options: SecurityOptions = {}): boolean {
    return this.canUser(user, model, "read", options);
  }

  public canUserWrite(user: User, model: BookshelfModel, options: SecurityOptions = {}): boolean {
    return this.canUser(user, model, "write", options);
  }

  public canUserManage(user: User, model: BookshelfModel, options: SecurityOptions = {}): boolean {
    return this.canUser(user, model, "manage", options);
  }

  /**
   * Checks if a user has sufficient rights for the given model.
   * Warning: Always returns false if no model is given.
   */
  public canUser(
    user: User,
    model: BookshelfModel,
    permission: SecurityPermission,
    options: SecurityOptions = {}): boolean {
    if (!user || !model) {
      return false;
    }
    if ((options.allowMods && this.isMod(user)) || (options.allowAdmins && this.isAdmin(user))) {
      return true;
    }

    // Comment
    if (model.get("user_id")) {
      if (permission === "read") {
        return this.canUser(user, model.related("node"), permission, options);
      } else {
        return model.get("user_id") === user.get("id");
      }
    }

    // Event (mods can only edit pending/open events)
    if (model.get("status")) {
      if (permission === "read") {
        return true;
      } else {
        return model.get("status") === enums.EVENT.STATUS.CLOSED ? this.isAdmin(user) : this.isMod(user);
      }
    }

    // User/Post (permission-based)
    if (!model.relations.userRoles) {
      throw new Error("Model does not have user roles");
    }
    const acceptPermissions = this.getPermissionsEqualOrAbove(permission);
    const allUserRoles = model.related<BookshelfCollection>("userRoles");
    if (acceptPermissions && allUserRoles) {
      const userRoles = allUserRoles.where({ user_id: user.get("id") }) as BookshelfModel[];
      for (const userRole of userRoles) {
        if (acceptPermissions.includes(userRole.get("permission"))) {
          return true;
        }
      }
    }
    return false;
  }

  public isMod(user: User): boolean {
    return user && (user.get("is_mod") || user.get("is_admin"));
  }

  public isAdmin(user: User): boolean {
    return user && user.get("is_admin");
  }

  public getPermissionsEqualOrAbove(permission: SecurityPermission): SecurityPermission[] {
    const permissionIndex = this.ORDERED_PERMISSIONS.indexOf(permission);
    if (permissionIndex !== -1) {
      return this.ORDERED_PERMISSIONS.slice(permissionIndex);
    } else {
      throw new Error("Unknown permission: " + permission
        + " (allowed: " + this.ORDERED_PERMISSIONS.join(",") + ")");
    }
  }

  public getHighestPermission(permissions: SecurityPermission[]): string {
    const highestIndex = permissions
      .map((permission) => this.ORDERED_PERMISSIONS.indexOf(permission))
      .reduce((index1, index2) => Math.max(index1, index2), -1);
    return this.ORDERED_PERMISSIONS[highestIndex];
  }

  /**
   * Adds a user right to a node.
   */
  public async addUserRight(
    user: User,
    node: BookshelfModel,
    nodeType: "post" | "entry",
    permission: SecurityPermission): Promise<void> {
    await node.load("userRoles");

    // Check if present already
    const userRoles = node.related<BookshelfCollection>("userRoles");
    const matchingRole = userRoles.find((userRole) => {
      return userRole.get("user_name") === user.get("name") &&
        userRole.get("permission") === permission;
    });

    // Update or create existing role
    if (!matchingRole) {
      let role = userRoles.find((userRole) => userRole.get("user_name") === user.get("name"));
      if (role) {
        role.set("permission", this.getHighestPermission([permission, role.get("permission")]));
      } else {
        role = new models.UserRole({
          user_id: user.get("id"),
          user_name: user.get("name"),
          user_title: user.get("title"),
          node_id: node.get("id"),
          node_type: nodeType,
          permission,
          event_id: node.get("event_id"),
        }) as BookshelfModel;
      }
      await role.save();
    }
  }

  /**
   * Removes a user right from a node. If the permission does not match exactly, does nothing.
   */
  public async removeUserRight(
    user: User,
    node: BookshelfModel,
    permission: SecurityPermission): Promise<void> {
    await node.load("userRoles");

    const userRoles = node.related<BookshelfCollection>("userRoles");
    const matchingRole = userRoles.find((userRole) => {
      return userRole.get("user_name") === user.get("name") &&
        userRole.get("permission") === permission;
    });
    if (matchingRole) {
      await matchingRole.destroy();
    }
  }

}

export default new Security();
