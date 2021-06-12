import * as crypto from "crypto";
import { Request } from "express";
import * as randomKey from "random-key";
import constants from "server/core/constants";
import forms from "server/core/forms";
import log from "server/core/log";
import * as models from "server/core/models";
import { UserRole } from "server/entity/user-role.entity";
import { User } from "server/entity/user.entity";
import { Mutable } from "server/types";
import { FindConditions, FindOneOptions, getRepository, ILike, IsNull, Not, SelectQueryBuilder } from "typeorm";

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

  public async countUsers(options: FindUserOptions = {}): Promise<number> {
    const qb = await this.createFindUsersQuery(options);
    return qb.getCount();
  }

  public async findUsers(options: FindUserOptions = {}): Promise<User[]> {
    const qb = await this.createFindUsersQuery(options);

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

  private createFindUsersQuery(options: FindUserOptions): SelectQueryBuilder<User> {
    const userRepository = getRepository(User);
    const qb = userRepository.createQueryBuilder("user");

    // Basic search

    const where: FindConditions<User> = {
      id: Not(constants.ANONYMOUS_USER_ID)
    };
    if (options.search) { where.title = ILike("%" + options.search + "%"); }
    if (options.isMod) { where.is_mod = Not(IsNull()); }
    if (options.isAdmin) { where.is_admin = Not(IsNull()); }
    qb.where(where);

    // Advanced search

    if (options.eventId) {
      qb.innerJoin("user.eventParticipations", "ep")
        .andWhere("ep.event_id = :eventId", { eventId: options.eventId });
    }
    if (options.entriesCount) {
      qb.leftJoinAndSelect((entriesCountQb) => {
        entriesCountQb
          .from(User, "user")
          .select([
            "COUNT(roles.user_id) as entries_count",
            "COUNT(roles.event_id) as akj_entries_count",
            "user.id as id"
          ])
          .innerJoin("user.roles", "roles", "roles.node_type = 'entry'")
          .groupBy("user.id");
        return entriesCountQb;
      }, "entriesCount", '"entriesCount"."id" = user.id');

      if (options.withEntries) {
        qb.andWhere('"entriesCount"."entries_count" > 0');
      }
    }
    if (options.page !== undefined || options.pageSize) {
      const page0Indexed = options.page ? options.page - 1 : 0;
      const pageSize = options.pageSize || 10;
      qb.offset(page0Indexed * pageSize)
        .limit(pageSize)
        .orderBy("created_at", "DESC");
    }
    if (options.orderBy) {
      qb.orderBy(`"user".${options.orderBy}`, options.orderByDesc ? "DESC" : "ASC");
    }

    return qb;
  }

  /**
   * Registers a new user
   * @param email
   * @param name
   * @param password unencrypted password (will be hashed before storage)
   * @returns the created user, or an error message
   */
  public async register(email: string, name: string, password: string, reqForTrace?: Request): Promise<User | string> {
    if (!forms.isUsername(name)) {
      return "Username is invalid. They may only contain letters, numbers, underscores or hyphens," +
        ` and must start with a letter. Length must be at least ${constants.USERNAME_MIN_LENGTH}. `;
    }

    const userRepository = getRepository(User);
    const conflictingUsers = await userRepository.createQueryBuilder()
      .where([
        { name: ILike(name) },
        { email: ILike(email) }
      ])
      .getCount();
    if (conflictingUsers > 0 || name === "anonymous") {
      return "Username or email is taken";
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
    const savedUser = await userRepository.save(user);

    if (reqForTrace) {
      const ip = reqForTrace.headers["x-forwarded-for"] || reqForTrace.socket.remoteAddress;
      log.info(`User ${name} has just registered (ip=${ip})`);
    }

    return savedUser;
  }

  /**
   * Authenticates against a user name and password, and updates the session accordingly
   * @param name
   * @param password clear password (will be hashed & compared to the DB entry)
   * @returns {User} The models.User, or false if the authentication failed
   */
  public async authenticate(name: string, password: string): Promise<User | false> {
    const user = await getRepository(User)
      .createQueryBuilder()
      .where([
        { email: ILike(name) },
        { name: ILike(name) }
      ])
      .getOne();

    if (user) {
      const hashToTest = this.hashPassword(password, user.password_salt);
      if (hashToTest === user.password) {
        return user;
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
    await user.loadDetails();
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
      return "Password length must be at least " + constants.PASSWORD_MIN_LENGTH.toString();
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
  withEntries?: boolean;
  isMod?: boolean;
  isAdmin?: boolean;
  orderBy?: keyof User;
  orderByDesc?: boolean;
  page?: number;
  pageSize?: number;
}

export default new UserService();
