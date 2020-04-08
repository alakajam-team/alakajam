import Bluebird = require("bluebird");
import { BookshelfCollection, BookshelfModel } from "bookshelf";
import * as crypto from "crypto";
import * as randomKey from "random-key";
import * as configUtils from "server/core/config";
import constants from "server/core/constants";
import db from "server/core/db";
import { ILike } from "server/core/db-typeorm-ilike";
import forms from "server/core/forms";
import log from "server/core/log";
import * as models from "server/core/models";
import { UserRole } from "server/entity/user-role.entity";
import { User } from "server/entity/user.entity";
import { Mutable } from "server/types";
import { FindConditions, FindOneOptions, getRepository, Not, IsNull } from "typeorm";

export class UserService {

  public async findById(id: number): Promise<User> {
    return getRepository(User).findOne({ where: { id } });
  }

  /**
   * Fetches a user
   */
  public async findByName(name: string, options: FindOneOptions<User> = {}): Promise<User> {
    return getRepository(User).findOne({
      where: { name: ILike(name) },
      relations: ["details"],
      ...options
    });
  }

  public async findByEmail(email: string): Promise<User> {
    return getRepository(User).findOne({ where: { email } });
  }

  public async findUsersTypeORM(options: FindUserOptions = {}): Promise<User[]> {
    const userRepository = getRepository(User);
    let qb = userRepository.createQueryBuilder("user");

    // Basic search

    const where: FindConditions<User> = {
      id: Not(constants.ANONYMOUS_USER_ID)
    }
    if (options.search) where.title = ILike("%" + options.search + "%");
    if (options.isMod) where.is_mod = Not(IsNull());
    if (options.isAdmin) where.is_admin = Not(IsNull());
    qb.where(where);

    // Advanced search

    if (options.eventId) {
      qb.innerJoin("user.roles", "roles")
        .andWhere("roles.event_id = :eventId", { eventId: options.eventId });
    }
    if (options.entriesCount) {
      qb.leftJoinAndSelect((entriesCountQb) => {
        entriesCountQb
          .from(User, "user")
          .select([
            "COUNT(roles.user_id) as entries_count",
            "COUNT(roles.event_id) as akj_entries_count",
            "user.id"
          ])
          .innerJoin("user.roles", "roles", "roles.node_type = 'entry'")
          .groupBy("user.id");
        return entriesCountQb;
      }, "entriesCount");

      if (options.withEntries) {
        qb.andWhere("entriesCount.entries_count > 0");
      }
    }

    if (options.entriesCount) {
      const results = await qb.getRawAndEntities();
      results.entities.forEach((user: Mutable<User>, index) => {
        // Assign entry counts to entities
        const raw = results.raw[index];
        user.entriesCount = raw.entries_count;
        user.akjEntriesCount = raw.akj_entries_count;
      });
      return results.entities;
    } else {
      return qb.getMany();
    }
  }

  /**
   * Fetches users
   * @returns {Collection(User)}
   */
  public async findUsers(options: FindUserOptions = {}): Promise<BookshelfCollection | string | number> {
    let query = new models.User()
      .where("user.id", "!=", constants.ANONYMOUS_USER_ID);
    if (options.search) {
      query = query.where("title", configUtils.ilikeOperator(), "%" + options.search + "%");
    }
    if (options.eventId) {
      query = query.query((qb) => {
        qb.distinct()
          .leftJoin("user_role", "user_role.user_id", "user.id")
          .where("user_role.event_id", options.eventId);
      });
    }

    if (options.entriesCount && !options.count) {
      const subQuery = models.User.forge<BookshelfModel>().query((qb) => {
        qb.count("user_role.user_id as entries_count")
          .count("user_role.event_id as akj_entries_count")
          .select("user.id")
          .leftJoin("user_role", function () {
            this.on("user_role.user_id", "=", "user.id")
              .andOn("user_role.node_type", "like", db.knex.raw("?", ["entry"]));
          })
          .groupBy("user.id")
          .as("c");
      });

      query = query.query((qb) => {
        qb.leftJoin(subQuery.query().as("c"), "c.id", "user.id");
        qb.select("user.*", "c.entries_count", "c.akj_entries_count");
        if (options.withEntries) {
          qb.where("c.entries_count", ">", 0);
        }
      });
    }
    if (options.isMod) { query.where("is_mod", true); }
    if (options.isAdmin) { query.where("is_admin", true); }

    if (options.count) {
      return query.count();
    } else if (options.page !== undefined || options.pageSize) {
      return query.orderBy("created_at", "DESC")
        .fetchPage(options);
    } else {
      if (options.orderBy) { query.orderBy(options.orderBy, options.orderByDesc ? "DESC" : "ASC"); }
      return query.fetchAll(options as any) as any;
    }
  }

  /**
   * Registers a new user
   * @param email
   * @param name
   * @param passwor unencrypted password (will be hashed before storage)
   * @returns the created user, or an error message
   */
  public async register(email: string, name: string, password: string): Promise<User | string> {
    if (!name.match(constants.USERNAME_VALIDATION_REGEX)) {
      return "Username must start with a letter. They may only contain letters, numbers, underscores or hyphens.";
    }
    if (name.length < constants.USERNAME_MIN_LENGTH) {
      return "Username length must be at least " + constants.USERNAME_MIN_LENGTH;
    }

    const userRepository = getRepository(User);
    const caseInsensitiveUsernameMatches = await userRepository.createQueryBuilder()
      .where("LOWER(name) LIKE LOWER(:name)", { name })
      .getCount();
    if (caseInsensitiveUsernameMatches > 0 || name === "anonymous") {
      return "Username is taken";
    }
    if (!forms.isEmail(email)) {
      return "Invalid email";
    }
    const passwordValidationResult = this.validatePassword(password);
    if (passwordValidationResult !== true) {
      return passwordValidationResult;
    }

    const user = new User(name, email);
    this.setPassword(user, password);
    await userRepository.save(user);

    return user;
  }

  /**
   * Authenticates against a user name and password, and updates the session accordingly
   * @param name
   * @param password clear password (will be hashed & compared to the DB entry)
   * @returns {User} The models.User, or false if the authentication failed
   */
  public async authenticate(name: string, password: string): Promise<User | false> {
    const user = await models.User.query((query) => {
      query
        .where(db.knex.raw("LOWER(name)") as any, name.toLowerCase())
        .orWhere("email", name);
    }).fetch();
    if (user) {
      const hashToTest = this.hashPassword(password, user.get("password_salt"));
      if (hashToTest === user.get("password")) {
        return user as any;
      }
    }
    return false;
  }

  /**
   * Deletes an user, but only if it doesn't have any entries.
   * @param {User} user
   */
  public async deleteUser(user: User, userEntryCount: number): Promise<{ error?: string }> {
    if (userEntryCount === 0) {
      const userId = user.id;
      const bookshelfUser = await models.User.where("id", user.id).fetch();
      await bookshelfUser.destroy(); // XXX Comment/entry counters are not refreshed
      log.info("User %s has been deleted", userId);
      return {};
    } else {
      return {
        error: "As a safety measure, you must manually delete or leave the team for all your entries "
          + "before deleting your account."
      };
    }
  }

  public async save(user: User): Promise<void> {
    await getRepository(User).save(user);
  }

  /**
   * Sets a password to a User
   * @param {User} user User model
   * @param {string} password New password, in clear form
   * @returns {boolean|string} true, or an error message
   */
  public setPassword(user: User, password: string): true | string {
    const passwordValidationResult = this.validatePassword(password);
    if (passwordValidationResult !== true) {
      return passwordValidationResult;
    }

    user.password_salt = randomKey.generate();
    user.password = this.hashPassword(password, user.password_salt);
    return true;
  }

  /**
   * Refreshes various models that cache user name and/or title.
   * Call this after changing the name or title of an user.
   * @param {User} user
   */
  public async refreshUserReferences(user: User): Promise<void> {
    const userRoleRepository = getRepository(UserRole);
    const userRoles = await userRoleRepository.find({
      where: { user_id: user.id }
    });

    for (const userRole of userRoles) {
      userRole.user_name = user.name;
      userRole.user_title = user.title;
    }

    await userRoleRepository.save(userRoles);
  }

  /**
   * Validates the given password
   * @param {string} password
   * @returns {boolean|string} true, or an error message
   */
  private validatePassword(password: string): true | string {
    if (password.length < constants.PASSWORD_MIN_LENGTH) {
      return "Password length must be at least " + constants.PASSWORD_MIN_LENGTH;
    } else {
      return true;
    }
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.createHash("sha256").update(password + salt).digest("hex");
  }

}

export interface FindUserOptions {
  search?: string;
  eventId?: number;
  entriesCount?: boolean;
  count?: boolean;
  withEntries?: boolean;
  isMod?: boolean;
  isAdmin?: boolean;
  orderBy?: string;
  orderByDesc?: boolean;
  page?: number;
  pageSize?: number;
}

export default new UserService();
