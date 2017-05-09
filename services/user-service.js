 'use strict'

/**
 * User service
 *
 * @module services/user-service
 */

 const crypto = require('crypto')
 const randomKey = require('random-key')
 const settingService = require('../services/setting-service')
 const User = require('../models/user-model')

 module.exports = {
   findById,
   findByName,
   register,
   authenticate,
   setPassword
 }

 const SETTING_PASSWORD_PEPPER = 'password_pepper'
 const USERNAME_VALIDATION_REGEX = /^[a-zA-Z][-\w]+$/g
 const USERNAME_MIN_LENGTH = 3
 const PASSWORD_MIN_LENGTH = 6

/**
 * Fetches a User
 * @param uuid {uuid} UUID
 * @returns {User}
 */
 async function findById (uuid) {
   return User.where('uuid', uuid).fetch()
 }

/**
 * Fetches a User
 * @param name {name} name
 * @returns {User}
 */
 async function findByName (name) {
   return User.where('name', name).fetch()
 }

/**
 * Registers a new user
 * @param name {string} name
 * @param password {string} clear password (will be hashed before storage)
 * @returns {boolean|string} true, or an error message
 */
 async function register (name, password) {
   if (!name.match(USERNAME_VALIDATION_REGEX)) {
     return 'Username must start with a letter. They may only contain letters, numbers, underscores or hyphens.'
   } 
   if (name.length < USERNAME_MIN_LENGTH) {
     return 'Username length must be at least ' + USERNAME_MIN_LENGTH
   }
   if (await User.where('name', name).count() > 0) {
     return 'Username is taken'
   }
   let passwordValidationResult = validatePassword(password)
   if (passwordValidationResult !== true) {
     return passwordValidationResult
   }

   let user = new User({
     name: name,
     title: name
   })
   setPassword(user, password)
   await user.save()
   return true
 }

/**
 * Authenticates against a user name and password, and updates the session accordingly
 * @param name {string} name
 * @param password {string} clear password (will be hashed & compared to the DB entry)
 * @returns {User} The User, or false if the authentication failed
 */
 async function authenticate (name, password) {
   let user = await User.query(function (query) {
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
 function setPassword(user, password) {
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
function validatePassword(password) {
  console.log(password)
   if (password.length < PASSWORD_MIN_LENGTH) {
     return 'Password length must be at least ' + PASSWORD_MIN_LENGTH
   } else {
      return true
   }
}

 function hashPassword (password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex')
 }
