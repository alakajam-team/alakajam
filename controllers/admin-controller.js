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
const log = require('../core/log')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const eventService = require('../services/event-service')
const userService = require('../services/user-service')
const settingService = require('../services/setting-service')
const platformService = require('../services/platform-service')
const tagService = require('../services/tag-service')
const likeService = require('../services/like-service')

module.exports = {
  adminMiddleware,

  adminHome,

  adminEvents,
  adminEventPresets,
  adminEventTemplates,
  adminPlatforms,
  adminTags,
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
    allowHidden: true,
    allowDrafts: true
  })
  let draftPosts = allPostsCollection.where({'published_at': null})

  res.render('admin/admin-home', {
    draftPosts,
    publishedPosts: allPostsCollection.difference(draftPosts),
    userLikes: await likeService.findUserLikeInfo(allPostsCollection, res.locals.user)
  })
}

/**
 * Events management
 */
async function adminEvents (req, res) {
  let eventsCollection = await eventService.findEvents()
  res.render('admin/admin-events', {
    events: eventsCollection.models
  })
}

/**
 * Event presets management
 */
async function adminEventPresets (req, res) {
  // Find template to edit
  let editEventPreset = null
  let editEventPresetId = req.query.edit || req.body.id
  if (forms.isId(editEventPresetId)) {
    editEventPreset = await eventService.findEventPresetById(parseInt(editEventPresetId))
  } else if (req.query.create !== undefined) {
    let referencePreset = null
    if (forms.isId(req.query.reference)) {
      referencePreset = await eventService.findEventPresetById(parseInt(req.query.reference))
    }
    editEventPreset = eventService.createEventPreset(referencePreset)
  }

  // Apply changes
  let errorMessage = null
  if (req.method === 'POST') {
    if (req.body.delete !== undefined) {
      // Delete model
      await eventService.deleteEventPreset(editEventPreset)
      editEventPreset = null
    } else {
      // Validation / Compute deadline offset
      // TODO Status radios validation (to be put in common with the event edition form)
      let offset = 0
      try {
        const offsetMinutes = parseInt(req.body['countdown-offset-d']) * 60 * 24 +
          parseInt(req.body['countdown-offset-h']) * 60 +
          parseInt(req.body['countdown-offset-m'])
        offset = offsetMinutes * 60000
      } catch (e) {
        errorMessage = 'Invalid deadline offset from start'
      }
      if (!req.body.title) {
        errorMessage = 'Title is required'
      }

      // Update model (without saving yet)
      editEventPreset = editEventPreset || eventService.createEventPreset()
      editEventPreset.set({
        title: forms.sanitizeString(req.body.title),
        status: forms.sanitizeString(req.body.status),
        status_rules: forms.sanitizeString(req.body['status-rules']),
        status_theme: forms.sanitizeString(req.body['status-theme']),
        status_entry: forms.sanitizeString(req.body['status-entry']),
        status_results: forms.sanitizeString(req.body['status-results']),
        status_tournament: forms.sanitizeString(req.body['status-tournament']),
        countdown_config: {
          message: forms.sanitizeString(req.body['countdown-message']),
          link: forms.sanitizeString(req.body['countdown-link']),
          offset: offset,
          phrase: forms.sanitizeString(req.body['countdown-phrase']),
          enabled: req.body['countdown-enabled'] === 'on'
        }
      })

      // Save if valid
      if (!errorMessage) {
        await editEventPreset.save()
        editEventPreset = null
      }
    }
  }

  // Render page
  let eventPresetsCollection = await eventService.findEventPresets()
  let context = {
    eventPresets: eventPresetsCollection.models,
    editEventPreset
  }
  if (editEventPreset) {
    let rawOffset = 1.0 * (editEventPreset.get('countdown_config').offset || 0)
    const minutesPerDay = 60.0 * 24.0
    let days = Math.floor(rawOffset / minutesPerDay)
    let rawOffsetWithoutDays = rawOffset - days * minutesPerDay
    context.countdownOffset = {
      d: days,
      h: Math.floor(rawOffsetWithoutDays / 60),
      m: rawOffsetWithoutDays % 60
    }
  }
  res.render('admin/admin-event-presets', context)
}

/**
 * Event templates management
 */
async function adminEventTemplates (req, res) {
  // Find template to edit
  let editEventTemplate = null
  let editEventTemplateId = req.query.edit || req.body.id
  if (forms.isId(editEventTemplateId)) {
    editEventTemplate = await eventService.findEventTemplateById(parseInt(editEventTemplateId))
  } else if (req.query.create !== undefined) {
    editEventTemplate = eventService.createEventTemplate()
  }

  // Apply changes
  let errorMessage = null
  if (req.method === 'POST') {
    if (req.body.delete !== undefined) {
      // Delete model
      await eventService.deleteEventTemplate(editEventTemplate)
      editEventTemplate = null
    } else {
      // Update model (without saving yet)
      editEventTemplate = editEventTemplate || eventService.createEventTemplate()
      editEventTemplate.set({
        title: forms.sanitizeString(req.body.title),
        event_title: forms.sanitizeString(req.body['event-title']),
        event_preset_id: req.body['event-preset-id'] || null,
        links: forms.parseJson(req.body['links'], { acceptInvalid: true }),
        divisions: forms.parseJson(req.body['divisions'], { acceptInvalid: true }),
        category_titles: forms.parseJson(req.body['category-titles'], { acceptInvalid: true })
      })

      // Validation
      if (!editEventTemplate.get('title')) {
        errorMessage = 'Title is required'
      } else if (forms.parseJson(req.body['links']) === false) {
        errorMessage = 'Invalid home page shortcuts JSON'
      } else if (forms.parseJson(req.body['divisions']) === false) {
        errorMessage = 'Invalid divisions JSON'
      } else if (forms.parseJson(req.body['category-titles']) === false) {
        errorMessage = 'Invalid rating categories JSON'
      }

      // Save if valid
      if (!errorMessage) {
        await editEventTemplate.save()
        editEventTemplate = null
      }
    }
  }

  // Render page
  let eventPresetsCollection = await eventService.findEventPresets()
  let eventTemplatesCollection = await eventService.findEventTemplates()
  res.render('admin/admin-event-templates', {
    eventPresets: eventPresetsCollection.models,
    eventTemplates: eventTemplatesCollection.models,
    editEventTemplate,
    errorMessage
  })
}

/**
 * Admin only: Platforms management
 */
async function adminPlatforms (req, res) {
  if (!config.DEBUG_ADMIN && !securityService.isAdmin(res.locals.user)) {
    res.errorPage(403)
  }

  let errorMessage = null

  // Save changed platform
  if (req.method === 'POST') {
    let name = forms.sanitizeString(req.body.name)
    if (name) {
      let platform = null

      if (forms.isId(req.body.id)) {
        platform = await platformService.fetchById(req.body.id)
        platform.set('name', name)
      } else {
        platform = platformService.createPlatform(forms.sanitizeString(req.body.name))
      }

      if (platform) {
        let duplicateCollection = await platformService.fetchMultipleNamed(platform.get('name'))
        let isDuplicate = false
        duplicateCollection.each(function (potentialDuplicate) {
          isDuplicate = isDuplicate || platform.get('id') !== potentialDuplicate.get('id')
        })
        if (!isDuplicate) {
          await platform.save()
          cache.general.del('platforms')
        } else {
          errorMessage = 'Duplicate platform'
        }
      }
    }
  }

  if (forms.isId(req.query.delete)) {
    let platform = await platformService.fetchById(req.query.delete)
    if (platform) {
      let entryCount = await platformService.countEntriesByPlatform(platform)
      if (entryCount === 0) {
        await platform.destroy()
      }
    } else {
      errorMessage = 'Platform to delete not found'
    }
  }

  // Fetch platform to edit
  let editPlatform
  if (forms.isId(req.query.edit)) {
    editPlatform = await platformService.fetchById(req.query.edit)
  } else if (req.query.create) {
    editPlatform = platformService.createPlatform('')
  }

  // Count entries by platform
  let platformCollection = await platformService.fetchAll()
  let entryCount = {}
  for (let platform of platformCollection.models) {
    entryCount[platform.get('id')] = await platformService.countEntriesByPlatform(platform)
  }

  res.render('admin/admin-platforms', {
    platforms: platformCollection.models,
    entryCount,
    editPlatform,
    errorMessage
  })
}

/**
 * Admin only: Tags management
 */
async function adminTags (req, res) {
  if (!config.DEBUG_ADMIN && !securityService.isAdmin(res.locals.user)) {
    res.errorPage(403)
  }

  let errorMessage = null

  // Tag deletion
  if (forms.isId(req.query.delete)) {
    let tag = await tagService.fetchById(req.query.delete)
    if (tag) {
      await tag.destroy()
    } else {
      errorMessage = 'Tag to delete not found'
    }
  }

  // Detailed tag view
  let detailedTag = null
  if (forms.isId(req.query.view)) {
    detailedTag = await tagService.fetchById(req.query.view, { withRelated: 'entries.userRoles' })
  }

  // Custom sorting
  let fetchTagsOptions = {}
  let sortBy = null
  if (req.query.sortBy === 'date') {
    fetchTagsOptions.orderByDate = true
    sortBy = 'date'
  }

  res.render('admin/admin-tags', {
    tags: await tagService.fetchTagStats(fetchTagsOptions),
    sortBy,
    detailedTag,
    errorMessage
  })
}

/**
 * Admin only: settings management
 */
async function adminSettings (req, res) {
  if (!config.DEBUG_ADMIN && !securityService.isAdmin(res.locals.user)) {
    res.errorPage(403)
  }

  // Save changed setting
  let currentEditValue
  if (req.method === 'POST') {
    if (constants.EDITABLE_SETTINGS.indexOf(req.body.key) !== -1) {
      let save = true
      if (constants.JSON_EDIT_SETTINGS.indexOf(req.body.key) !== -1) {
        try {
          // Minimize JSON
          req.body.value = JSON.stringify(JSON.parse(req.body.value))
        } catch (e) {
          // We re-send the user to the edit page with an error message
          save = false
          req.query.edit = req.body.key
          currentEditValue = req.body.value
          res.locals.errorMessage = 'This setting field needs to be a valid JSON field'
        }
      }
      if (save) {
        currentEditValue = forms.sanitizeString(req.body.value, { maxLength: 10000 })
        await settingService.save(req.body.key, currentEditValue)
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
        log.error('Field ' + req.query.edit + ' is not a valid JSON')
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
  if (!config.DEBUG_ADMIN && !securityService.isAdmin(res.locals.user)) {
    res.errorPage(403)
  }

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
  if (!config.DEBUG_ADMIN && !securityService.isAdmin(res.locals.user)) {
    res.errorPage(403)
  }

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
  if (res.app.locals.devMode && (config.DEBUG_ADMIN || securityService.isAdmin(res.locals.user))) {
    let infoMessage = ''
    let errorMessage = ''
    if (req.method === 'POST') {
      if (req.body['db-reset']) {
        await db.emptyDatabase()
        let newVersion = await db.initDatabase(config.DEBUG_INSERT_SAMPLES)
        infoMessage = 'DB reset done (current version : ' + newVersion + ').'
      } else if (req.body['replace-passwords']) {
        let users = await userService.findUsers({ pageSize: 30 })
        await db.transaction(async function (t) {
          for (let user of users.models) {
            userService.setPassword(user, 'password')
            await user.save(null, { transacting: t })
          }
        })
        infoMessage = 'The last 30 created users now have their password set to "password".'
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
