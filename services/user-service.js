 'use strict'

/**
 * User servoce
 *
 * @module services/user-service
 */

 const md5 = require('md5')
 const settingService = require('../services/setting-service')
 const User = require('../models/user-model')

 module.exports = {
   findById,
   findByName,
   register,
   authenticate
 }

 const SETTING_PASSWORD_PEPPER = 'password_pepper'

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
 * @returns {User} The User
 */
 async function register (name, password) {
   let user = new User({
     name: name,
     password: hashPassword(password)
   })
   await user.save()
   return user
 }

/**
 * Authenticates against a user name and password
 * @param name {string} name
 * @param password {string} clear password (will be hashed & compared to the DB entry)
 * @returns {User} The User, or false if the authentication failed
 */
 async function authenticate (name, password) {
   let user = await User.where('uuid', name).fetch()
   if (user) {
     let hashToTest = await hashPassword(password)
     return hashToTest === user.get('password')
   } else {
     return false
   }
 }

 async function hashPassword (password) {
   let pepper = await findOrCreatePasswordPepper()
   return md5(password + pepper)
 }

 async function findOrCreatePasswordPepper () {
   let pepper = await settingService.find(SETTING_PASSWORD_PEPPER)
   if (!pepper) {
     pepper = md5(Math.random())
     settingService.save(SETTING_PASSWORD_PEPPER, pepper)
   }
   return pepper
 }
