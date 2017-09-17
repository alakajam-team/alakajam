'use strict'

/**
 * models.User service
 *
 * @module services/user-service
 */

const crypto = require('crypto')
const randomKey = require('random-key')
const config = require('../config')
const constants = require('../core/constants')
const forms = require('../core/forms')
const models = require('../core/models')

module.exports = {
  findUsers,
  findById,
  findByName,
  searchByName,

  register,
  authenticate,

  setPassword,
  refreshUserReferences
}

const USERNAME_VALIDATION_REGEX = /^[a-zA-Z][-\w]+$/g
const USERNAME_MIN_LENGTH = 3
const PASSWORD_MIN_LENGTH = 6

/**
 * Fetches users
 * @returns {Collection(User)}
 */
async function findUsers (options = {}) {
  let query = models.User.forge()
  if (options.search) {
    query = query.where('title', (config.DB_TYPE === 'postgresql') ? 'ILIKE' : 'LIKE', '%' + options.search + '%')
  }
  if (options.eventId) {
    query = query.query(function (qb) {
      qb.distinct()
        .leftJoin('user_role', 'user_role.user_id', 'user.id')
        .where('user_role.event_id', options.eventId)
    })
  }

  query = query.query(function (qb) {
    qb.where('name', '!=', 'anonymous');
  })

  if (options.count) {
    return query.count(options)
  } else if (options.page) {
    return query.orderBy('created_at', 'DESC')
      .fetchPage(options)
  } else {
    return query.fetchAll(options)
  }
}

/**
 * Fetches a user
 * @param id {id} ID
 * @returns {User}
 */
async function findById (id) {
  return models.User.where('id', id).fetch()
}

/**
 * Fetches a user
 * @param name {name} name
 * @returns {User}
 */
async function findByName (name) {
  // XXX Case-insensitive search
  if (config.DB_TYPE === 'postgresql') {
    return models.User.where('name', 'ILIKE', name).fetch({ withRelated: 'details' })
  } else {
    return models.User.where('name', 'LIKE', name).fetch({ withRelated: 'details' })
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
async function searchByName (fragment, options = {}) {
  const comparator = (options.caseSensitive || config.DB_TYPE !== 'postgresql') ? 'LIKE' : constants.DB_ILIKE
  return models.User.where('name', comparator, `%${fragment}%`).fetchAll({
    withRelated: options.related
  })
}

/**
 * Registers a new user
 * @param email {string} email
 * @param name {string} name
 * @param password {string} unencrypted password (will be hashed before storage)
 * @returns {boolean|string} true, or an error message
 */
async function register (email, name, password) {
  if (!name.match(USERNAME_VALIDATION_REGEX)) {
    return 'Username must start with a letter. They may only contain letters, numbers, underscores or hyphens.'
  }
  if (name.length < USERNAME_MIN_LENGTH) {
    return 'Username length must be at least ' + USERNAME_MIN_LENGTH
  }
  let caseInsensitiveUsernameMatch = await models.User.query(function (query) {
    query.whereRaw("LOWER(name) LIKE '%' || LOWER(?) || '%' ", name)
  }).fetch()
  if (caseInsensitiveUsernameMatch) {
    return 'Username is taken'
  }
  if (!forms.isEmail(email)) {
    return 'Invalid email'
  }
  let passwordValidationResult = validatePassword(password)
  if (passwordValidationResult !== true) {
    return passwordValidationResult
  }

  let user = new models.User({
    email: email,
    name: name,
    title: name
  })
  setPassword(user, password)
  await user.save()

  let userDetails = new models.UserDetails({
    user_id: user.get('id')
  })
  await userDetails.save()

  return true
}

/**
 * Authenticates against a user name and password, and updates the session accordingly
 * @param name {string} name
 * @param password {string} clear password (will be hashed & compared to the DB entry)
 * @returns {User} The models.User, or false if the authentication failed
 */
async function authenticate (name, password) {
  let user = await models.User.query(function (query) {
    query.where('name', name).orWhere('email', name)
  }).fetch()
  if (user) {
    let hashToTest = hashPassword(password, user.get('password_salt'))
    if (hashToTest === user.get('password')) {
      return user
    }
  }
  return false
}

/**
 * Sets a password to a User
 * @param {User} user User model
 * @param {string} password New password, in clear form
 * @returns {boolean|string} true, or an error message
 */
function setPassword (user, password) {
  let passwordValidationResult = validatePassword(password)
  if (passwordValidationResult !== true) {
    return passwordValidationResult
  }

  let salt = randomKey.generate()
  user.set('password_salt', salt)
  let hash = hashPassword(password, salt)
  user.set('password', hash)
  return true
}

/**
 * Validates the given password
 * @param {string} password
 * @returns {boolean|string} true, or an error message
 */
function validatePassword (password) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'Password length must be at least ' + PASSWORD_MIN_LENGTH
  } else {
    return true
  }
}

function hashPassword (password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex')
}

/**
 * Refreshes various models that cache user name and/or title.
 * Call this after changing the name or title of an user.
 * @param {User} user
 */
async function refreshUserReferences (user) {
  // TODO Transaction
  let userRolesCollection = await models.UserRole.where('user_id', user.get('id')).fetchAll()
  for (let userRole of userRolesCollection.models) {
    userRole.set('user_name', user.get('name'))
    userRole.set('user_title', user.get('title'))
    await userRole.save()
  }
}
