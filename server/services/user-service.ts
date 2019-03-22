
/**
 * User service
 *
 * @module services/user-service
 */

import * as crypto from "crypto";
import * as path from "path";
import * as randomKey from "random-key";
import config from "../core/config";
import constants from "../core/constants";
import db from "../core/db";
import fileStorage from "../core/file-storage";
import forms from "../core/forms";
import log from "../core/log";
import * as models from "../core/models";
import eventService from "./event-service";
import mailService from "./mail-service";

export default {
  findUsers,
  findById,
  findByName,
  searchByName,

  register,
  authenticate,
  deleteUser,

  setPassword,
  refreshUserReferences,

  loadPasswordRecoveryCache,
  sendPasswordRecoveryEmail,
  validatePasswordRecoveryToken,
  setPasswordUsingToken,
};

const USERNAME_VALIDATION_REGEX = /^[a-zA-Z][-\w]+$/g;
const USERNAME_MIN_LENGTH = 3;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_RECOVERY_TOKENS_FILE = path.join(config.DATA_PATH, "password-recovery.json");
const PASSWORD_RECOVERY_LINK_MAX_AGE = 24 * 3600000; /* 1 day */

/**
 * Fetches users
 * @returns {Collection(User)}
 */
async function findUsers(options: any = {}) {
  let query = models.User.forge()
    .where("name", "!=", "anonymous");
  if (options.search) {
    query = query.where("title", (config.DB_TYPE === "postgresql") ? "ILIKE" : "LIKE", "%" + options.search + "%");
  }
  if (options.eventId) {
    query = query.query((qb) => {
      qb.distinct()
        .leftJoin("user_role", "user_role.user_id", "user.id")
        .where("user_role.event_id", options.eventId);
    });
  }
  if (options.entriesCount && !options.count) {
    const subQuery = models.User.forge().query((qb) => {
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
    return query.count(options);
  } else if (options.page !== undefined || options.pageSize) {
    return query.orderBy("created_at", "DESC")
      .fetchPage(options);
  } else {
    if (options.orderBy) { query.orderBy(options.orderBy, options.orderByDesc ? "DESC" : "ASC"); }
    return query.fetchAll(options);
  }
}

/**
 * Fetches a user
 * @param id {id} ID
 * @returns {User}
 */
async function findById(id) {
  return models.User.where("id", id).fetch();
}

/**
 * Fetches a user
 * @param name {name} name
 * @returns {User}
 */
async function findByName(name) {
  // XXX Case-insensitive search
  if (config.DB_TYPE === "postgresql") {
    return models.User.where("name", "ILIKE", name).fetch({ withRelated: "details" });
  } else {
    return models.User.where("name", "LIKE", name).fetch({ withRelated: "details" });
  }
}

/**
 * Search users by name
 * @param {string} fragment a fragment of the user name.
 * @param {string|Object|mixed[]} [options.related] any related data to fetch.
 * @param {boolean} [options.caseSensitive=false] use case-sensitive search.
 * @returns {Bookshelf.Collection} the users with names matching the query.
 *
 * Note: all searches will be case-sensitive if developing with SQLite.
 */
async function searchByName(fragment, options: any = {}) {
  const comparator = (options.caseSensitive || config.DB_TYPE !== "postgresql") ? "LIKE" : constants.DB_ILIKE;
  return models.User.where("name", comparator, `%${fragment}%`).fetchAll({
    withRelated: options.related,
  });
}

/**
 * Registers a new user
 * @param email {string} email
 * @param name {string} name
 * @param password {string} unencrypted password (will be hashed before storage)
 * @returns {User|string} the created user, or an error message
 */
async function register(email, name, password) {
  if (!name.match(USERNAME_VALIDATION_REGEX)) {
    return "Username must start with a letter. They may only contain letters, numbers, underscores or hyphens.";
  }
  if (name.length < USERNAME_MIN_LENGTH) {
    return "Username length must be at least " + USERNAME_MIN_LENGTH;
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
  const passwordValidationResult = validatePassword(password);
  if (passwordValidationResult !== true) {
    return passwordValidationResult;
  }

  const user = new models.User({
    email,
    name,
    title: name,
  });
  setPassword(user, password);
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
async function authenticate(name, password) {
  const user = await models.User.query((query) => {
    query
      .where(db.knex.raw("LOWER(name)"), name.toLowerCase())
      .orWhere("email", name);
  }).fetch();
  if (user) {
    const hashToTest = hashPassword(password, user.get("password_salt"));
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
async function deleteUser(user) {
  const entries = await eventService.findUserEntries(user);
  if (entries.length === 0) {
    const userId = user.get("id");
    await user.destroy(); // XXX Comment/entry counters are not refreshed
    log.info("User %s has been deleted", userId);
    return {};
  } else {
    return { error: "As a safety measure, you must manually delete or leave the team for all your entries "
     + "before deleting your account." };
  }
}

/**
 * Sets a password to a User
 * @param {User} user User model
 * @param {string} password New password, in clear form
 * @returns {boolean|string} true, or an error message
 */
function setPassword(user, password) {
  const passwordValidationResult = validatePassword(password);
  if (passwordValidationResult !== true) {
    return passwordValidationResult;
  }

  const salt = randomKey.generate();
  user.set("password_salt", salt);
  const hash = hashPassword(password, salt);
  user.set("password", hash);
  return true;
}

/**
 * Validates the given password
 * @param {string} password
 * @returns {boolean|string} true, or an error message
 */
function validatePassword(password) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Password length must be at least " + PASSWORD_MIN_LENGTH;
  } else {
    return true;
  }
}

function hashPassword(password, salt) {
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

/**
 * Refreshes various models that cache user name and/or title.
 * Call this after changing the name or title of an user.
 * @param {User} user
 */
async function refreshUserReferences(user) {
  // TODO Transaction
  const userRolesCollection = await models.UserRole.where("user_id", user.get("id")).fetchAll();
  for (const userRole of userRolesCollection.models) {
    userRole.set("user_name", user.get("name"));
    userRole.set("user_title", user.get("title"));
    await userRole.save();
  }
}

async function loadPasswordRecoveryCache(app) {
  if (await fileStorage.exists(PASSWORD_RECOVERY_TOKENS_FILE)) {
    const rawFile = await fileStorage.read(PASSWORD_RECOVERY_TOKENS_FILE);
    app.locals.passwordRecoveryTokens = JSON.parse(rawFile);
  } else {
    app.locals.passwordRecoveryTokens = {};
  }
}

async function sendPasswordRecoveryEmail(app, email) {
  // Make sure the user exists
  const user = await models.User.where("email", email).fetch();
  if (user) {
    // Routine work: clear expired tokens
    const passwordRecoveryTokens = app.locals.passwordRecoveryTokens;
    const now = Date.now();
    for (const key in passwordRecoveryTokens) {
      if (passwordRecoveryTokens[key].expires < now) {
        delete passwordRecoveryTokens[key];
      }
    }

    // Create token
    const token = randomKey.generate(32);
    passwordRecoveryTokens[token] = {
      userId: user.get("id"),
      expires: Date.now() + PASSWORD_RECOVERY_LINK_MAX_AGE,
    };
    fileStorage.write(PASSWORD_RECOVERY_TOKENS_FILE, passwordRecoveryTokens);

    // Send email
    const context = {
      user,
      token,
    };
    await mailService.sendMail(app, user, "Your password recovery link", "password-recovery", context);
  }
}

function validatePasswordRecoveryToken(app, token) {
  return app.locals.passwordRecoveryTokens[token] &&
    app.locals.passwordRecoveryTokens[token].expires > Date.now();
}

/**
 *
 * @param {App} app
 * @param {string} token
 * @param {string} password
 * @returns {boolean|string} true or an error message
 */
async function setPasswordUsingToken(app, token, password) {
  if (validatePasswordRecoveryToken(app, token)) {
    const userId = app.locals.passwordRecoveryTokens[token].userId;
    const user = await findById(userId);
    if (user) {
      const success = setPassword(user, password);
      if (success) {
        await user.save();
        delete app.locals.passwordRecoveryTokens[token];
        fileStorage.write(PASSWORD_RECOVERY_TOKENS_FILE, app.locals.passwordRecoveryTokens);
      }
      return success;
    } else {
      return "This user does not exist";
    }
  } else {
    return "Invalid password recovery token";
  }
}
