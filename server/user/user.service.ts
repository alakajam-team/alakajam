import Bluebird = require("bluebird");
import { BookshelfCollection, BookshelfModel, FetchPageOptions } from "bookshelf";
import * as crypto from "crypto";
import * as randomKey from "random-key";
import * as configUtils from "server/core/config";
import constants from "server/core/constants";
import db from "server/core/db";
import { ILike } from "server/core/db-typeorm-ilike";
import forms from "server/core/forms";
import log from "server/core/log";
import * as models from "server/core/models";
import { User } from "server/entity/user.entity";
import { FindOneOptions, getRepository } from "typeorm";

export class UserService {

  public async findById(id: number): Promise<User> {
    const userRepository = getRepository(User);
    return userRepository.findOne({ where: { id } });
  }

  /**
   * Fetches a user
   */
  public async findByName(name: string, options: FindOneOptions<User> = {}): Promise<User> {
    const userRepository = getRepository(User);
    return userRepository.findOne({
      where: { name: ILike(name) },
      relations: ["details"],
      ...options
    });
  }

  public async findByEmail(email: string): Promise<User> {
    const userRepository = getRepository(User);
    return userRepository.findOne({ where: { email } });
  }

  /**
   * Fetches users
   * @returns {Collection(User)}
   */
  public async findUsers(
    options: {
      search?: boolean; eventId?: boolean; entriesCount?: boolean; count?: boolean; withEntries?: boolean;
      isMod?: boolean; isAdmin?: boolean; orderBy?: string; orderByDesc?: boolean;
    } & FetchPageOptions = {}): Promise<BookshelfCollection | string | number> {
    let query = new models.User()
      .where("name", "!=", "anonymous");
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
          .leftJoin("user_role", function() {
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
      return query.fetchAll(options) as Bluebird<BookshelfCollection>;
    }
  }

  /**
   * Registers a new user
   * @param email
   * @param name
   * @param passwor unencrypted password (will be hashed before storage)
   * @returns the created user, or an error message
   */
  public async register(email: string, name: string, password: string): Promise<BookshelfModel | string> {
    if (!name.match(constants.USERNAME_VALIDATION_REGEX)) {
      return "Username must start with a letter. They may only contain letters, numbers, underscores or hyphens.";
    }
    if (name.length < constants.USERNAME_MIN_LENGTH) {
      return "Username length must be at least " + constants.USERNAME_MIN_LENGTH;
    }

    const caseInsensitiveUsernameMatch = await models.User.query((query) => {
      query.whereRaw("LOWER(name) LIKE '%' || LOWER(?) || '%' ", name);
    }).fetch();
    if (caseInsensitiveUsernameMatch || name === "anonymous") {
      return "Username is taken";
    }
    if (!forms.isEmail(email)) {
      return "Invalid email";
    }
    const passwordValidationResult = this.validatePassword(password);
    if (passwordValidationResult !== true) {
      return passwordValidationResult;
    }

    const user = new models.User({
      email,
      name,
      title: name,
    });
    this.setPassword(user, password);
    await user.save();

    const userDetails = new models.UserDetails({
      user_id: user.get("id"),
    });
    await userDetails.save();

    return user;
  }

  /**
   * Authenticates against a user name and password, and updates the session accordingly
   * @param name {string} name
   * @param password {string} clear password (will be hashed & compared to the DB entry)
   * @returns {User} The models.User, or false if the authentication failed
   */
  public async authenticate(name, password): Promise<BookshelfModel | false> {
    const user = await models.User.query((query) => {
      query
        .where(db.knex.raw("LOWER(name)") as any, name.toLowerCase())
        .orWhere("email", name);
    }).fetch();
    if (user) {
      const hashToTest = this.hashPassword(password, user.get("password_salt"));
      if (hashToTest === user.get("password")) {
        return user;
      }
    }
    return false;
  }

  /**
   * Deletes an user, but only if it doesn't have any entries.
   * @param {User} user
   */
  public async deleteUser(user: User, userEntries: BookshelfCollection): Promise<{ error?: string }> {
    if (userEntries.length === 0) {
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

  public async save(user: User) {
    const repository = getRepository(User);
    await repository.save(user);
  }

  /**
   * Sets a password to a User
   * @param {User} user User model
   * @param {string} password New password, in clear form
   * @returns {boolean|string} true, or an error message
   */
  public setPassword(user, password) {
    const passwordValidationResult = this.validatePassword(password);
    if (passwordValidationResult !== true) {
      return passwordValidationResult;
    }

    const salt = randomKey.generate();
    user.set("password_salt", salt);
    const hash = this.hashPassword(password, salt);
    user.set("password", hash);
    return true;
  }

  /**
   * Refreshes various models that cache user name and/or title.
   * Call this after changing the name or title of an user.
   * @param {User} user
   */
  public async refreshUserReferences(user) {
    // TODO Transaction
    const userRolesCollection = await models.UserRole
      .where("user_id", user.get("id"))
      .fetchAll() as BookshelfCollection;
    for (const userRole of userRolesCollection.models) {
      userRole.set("user_name", user.get("name"));
      userRole.set("user_title", user.get("title"));
      await userRole.save();
    }
  }

  /**
   * Validates the given password
   * @param {string} password
   * @returns {boolean|string} true, or an error message
   */
  private validatePassword(password) {
    if (password.length < constants.PASSWORD_MIN_LENGTH) {
      return "Password length must be at least " + constants.PASSWORD_MIN_LENGTH;
    } else {
      return true;
    }
  }

  private hashPassword(password, salt) {
    return crypto.createHash("sha256").update(password + salt).digest("hex");
  }

}

export default new UserService();
