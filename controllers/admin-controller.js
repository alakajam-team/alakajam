'use strict'

/**
 * Global pages
 *
 * @module controllers/main-controller
 */

const config = require('../config')
const db = require('../core/db')
const constants = require('../core/constants')
const forms = require('../core/forms')
const cache = require('../core/cache')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const eventService = require('../services/event-service')
const userService = require('../services/user-service')
const settingService = require('../services/setting-service')

module.exports = {
  adminMiddleware,

  adminHome,
  adminArticles,

  adminEvents,
  adminSettings,
  adminUsers,
  adminStatus,
  adminDev
}

async function adminMiddleware (req, res, next) {
  res.locals.pageTitle = 'Mod dashboard'

  if (!config.DEBUG_ADMIN && !securityService.isMod(res.locals.user)) {
    res.errorPage(403)
  } else {
    next()
  }
}

/**
 * Edit home announcements
 */
async function adminHome (req, res) {
  let allPostsCollection = await postService.findPosts({
    specialPostType: constants.SPECIAL_POST_TYPE_ANNOUNCEMENT,
    allowDrafts: true
  })
  let draftPosts = allPostsCollection.where({'published_at': null})
  res.render('admin/admin-home', {
    draftPosts,
    publishedPosts: allPostsCollection.difference(draftPosts)
  })
}

/**
 * Edit articles
 */
async function adminArticles (req, res) {
  let allPostsCollection = await postService.findPosts({
    specialPostType: constants.SPECIAL_POST_TYPE_ARTICLE,
    allowDrafts: true
  })

  let missingArticles = []
  for (let articleName of constants.REQUIRED_ARTICLES) {
    if (!allPostsCollection.find((post) => post.get('name') === articleName)) {
      missingArticles.push(articleName)
    }
  }

  let draftPosts = allPostsCollection.where({'published_at': null})
  res.render('admin/admin-articles', {
    draftPosts,
    publishedPosts: allPostsCollection.difference(draftPosts),
    missingArticles
  })
}

/**
 * Admin only: events management
 */
async function adminEvents (req, res) {
  let events = await eventService.findEvents()
  res.render('admin/admin-events', {
    events: events.models
  })
}

/**
 * Admin only: settings management
 */
async function adminSettings (req, res) {
  // Save changed setting
  let currentEditValue
  if (req.method === 'POST') {
    let {fields} = await req.parseForm()
    if (constants.EDITABLE_SETTINGS.indexOf(fields.key) !== -1) {
      let save = true
      if (constants.JSON_EDIT_SETTINGS.indexOf(fields.key) !== -1) {
        try {
          // Minimize JSON
          fields.value = JSON.stringify(JSON.parse(fields.value))
        } catch (e) {
          // We re-send the user to the edit page with an error message
          save = false
          req.query.edit = fields.key
          currentEditValue = fields.value
          res.locals.errorMessage = 'This setting field needs to be a valid JSON field'
        }
      }
      if (save) {
        currentEditValue = forms.sanitizeString(fields.value, 10000)
        await settingService.save(fields.key, currentEditValue)
      }
    } else {
      res.errorPage(403, 'Tried to edit a non-editable setting')
      return
    }
  }

  // Gather editable settings
  let settings = []
  for (let key of constants.EDITABLE_SETTINGS) {
    settings.push({
      key,
      value: await settingService.find(key)
    })
    if (!currentEditValue && req.query.edit && key === req.query.edit) {
      currentEditValue = settings[settings.length - 1]['value']
    }
  }

  // Fetch setting to edit (and make JSON pretty)
  let editSetting
  if (req.query.edit && forms.isSlug(req.query.edit)) {
    let jsonSetting = constants.JSON_EDIT_SETTINGS.indexOf(req.query.edit) !== -1
    if (jsonSetting) {
      try {
        currentEditValue = JSON.stringify(JSON.parse(currentEditValue), null, 4)
      } catch (e) {
        console.log('Field ' + req.query.edit + ' is not a valid JSON')
      }
    }

    editSetting = {
      key: req.query.edit,
      value: currentEditValue,
      jsonSetting: jsonSetting
    }
  }

  res.render('admin/admin-settings', {
    settings,
    editSetting
  })
}

/**
 * Admin only: users management
 */
async function adminUsers (req, res) {
  let users = await userService.findUsers()
  let sortedUsers = users.sortBy((user) => user.get('title'))
  res.render('admin/admin-users', {
    users: sortedUsers
  })
}

/**
 * Admin only: server status
 */
async function adminStatus (req, res) {
  if (req.query.clearCache && cache.cacheMap[req.query.clearCache]) {
    cache.cacheMap[req.query.clearCache].flushAll()
  }

  let pictureResizeEnabled = false
  try {
    require('sharp')
    pictureResizeEnabled = true
  } catch (e) {
    // Nothing
  }

  res.render('admin/admin-status', {
    devMode: !!res.app.locals.devMode,
    pictureResizeEnabled,
    caches: cache.cacheMap
  })
}

/**
 * Admin only: developer tools
 */
async function adminDev (req, res) {
  if (res.app.locals.devMode) {
    let infoMessage = ''
    let errorMessage = ''
    if (req.method === 'POST') {
      let {fields} = await req.parseForm()
      if (fields['db-reset']) {
        await db.emptyDatabase()
        let newVersion = await db.initDatabase(config.DEBUG_INSERT_SAMPLES)
        infoMessage = 'DB reset done (current version : ' + newVersion + ').'
      }
    }
    res.render('admin/admin-dev', {
      infoMessage,
      errorMessage
    })
  } else {
    res.errorPage(403, 'Page only available in development mode')
  }
}
