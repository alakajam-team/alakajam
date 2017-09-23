'use strict'

/**
 * JSON API
 *
 * @module controllers/api-controller
 */

const moment = require('moment')
const urllib = require('url')
const config = require('../config')
const forms = require('../core/forms')
const eventService = require('../services/event-service')
const userService = require('../services/user-service')
const settingService = require('../services/setting-service')
const buildUrl = require('./templating').buildUrl

const PUBLIC_ATTRIBUTES_EVENT = ['id', 'name', 'title', 'display_dates', 'display_theme', 'status', 'status_theme', 'status_entry', 'status_results', 'countdown_config']
const PUBLIC_ATTRIBUTES_ENTRY = ['id', 'event_id', 'event_name', 'name', 'title', 'description', 'links', 'pictures', 'category', 'comment_count', 'feedback_score']
const PUBLIC_ATTRIBUTES_USER = ['id', 'name', 'title', 'avatar', 'is_mod', 'is_admin']
const PUBLIC_ATTRIBUTES_COMMENT = ['id', 'user_id', 'parent_id', 'body', 'created_at', 'updated_at']

module.exports = {
  index,
  featuredEvent,
  event,
  entry,
  user,
  userLatestEntry
}

async function index (req, res) {
  res.locals.pageTitle = 'API'

  res.render('api/index', {
    sidebar: await settingService.findArticlesSidebar()
  })
}

/**
 * Data about the currently featured event
 */
async function featuredEvent (req, res) {
  if (res.locals.featuredEvent) {
    req.params.event = res.locals.featuredEvent.get('id')
    return event(req, res)
  } else {
    _renderJson(req, res, 404, { error: 'No featured event' })
  }
}

/**
 * Data about a specific event
 */
async function event (req, res) {
  let json = {}
  let status = 200

  let event
  if (req.params.event && forms.isId(req.params.event)) {
    event = await eventService.findEventById(req.params.event)
  } else {
    event = await eventService.findEventByName(req.params.event)
  }

  if (event) {
    json = _getAttributes(event, PUBLIC_ATTRIBUTES_EVENT)
    if (json.countdown_config.date) {
      let result = json.title + ' ' + json.countdown_config.phrase

      let countdownMs = moment(json.countdown_config.date).valueOf() - Date.now()
      if (countdownMs > 0) {
        let days = Math.floor(countdownMs / (24 * 3600000))
        countdownMs -= days * (24 * 3600000)
        let hours = Math.floor(countdownMs / 3600000)
        countdownMs -= hours * 3600000
        let minutes = Math.floor(countdownMs / 60000)
        countdownMs -= minutes * 60000
        let seconds = Math.floor(countdownMs / 1000)

        result += ' in '
        if (minutes > 0 || hours > 0 || days > 0) {
          if (hours > 0 || days > 0) {
            if (days > 0) {
              result += days + ' day' + (seconds !== 1 ? 's' : '') + ', '
            }
            result += hours + ' hour' + (hours !== 1 ? 's' : '') + ', '
          }
          result += minutes + ' minute' + (minutes !== 1 ? 's' : '') + ' and '
        }
        result += seconds + ' second' + (seconds !== 1 ? 's' : '')
      } else {
        result += ' now!'
      }

      json.countdown_formatted = result
    }

    await event.load('entries.userRoles.user')
    json.entries = []
    for (let entry of event.related('entries').models) {
      let entryJson = _getAttributes(entry, PUBLIC_ATTRIBUTES_ENTRY)

      entryJson.users = []
      for (let user of entry.related('userRoles').models) {
        entryJson.users.push(_getAttributes(user.related('user'), PUBLIC_ATTRIBUTES_USER))
      }
      json.entries.push(entryJson)
    }
  } else {
    json = { error: 'Event not found' }
    status = 404
  }

  _renderJson(req, res, status, json)
}

/**
 * Data about a specific entry
 */
async function entry (req, res) {
  let json = {}
  let status = 200

  if (forms.isId(req.params.entry)) {
    let entry = await eventService.findEntryById(req.params.entry)
    if (entry) {
      json = _getAttributes(entry, PUBLIC_ATTRIBUTES_ENTRY)

      await entry.load('comments')
      json.comments = []
      for (let comment of entry.related('comments').models) {
        json.comments.push(_getAttributes(comment, PUBLIC_ATTRIBUTES_COMMENT))
      }

      await entry.load('userRoles.user')
      json.users = []
      for (let user of entry.related('userRoles').models) {
        json.users.push(_getAttributes(user.related('user'), PUBLIC_ATTRIBUTES_USER))
      }
    } else {
      json = { error: 'Entry not found' }
      status = 404
    }
  } else {
    json = { error: 'Invalid entry ID' }
    status = 400
  }

  _renderJson(req, res, status, json)
}

/**
 * Data about a specific user
 */
async function user (req, res) {
  let json = {}
  let status = 200

  let user
  if (forms.isId(req.params.user)) {
    user = await userService.findById(req.params.user)
  } else {
    user = await userService.findByName(req.params.user)
  }

  if (user) {
    json = _getAttributes(user, PUBLIC_ATTRIBUTES_USER)

    json.entries = []
    for (let entry of (await eventService.findUserEntries(user)).models) {
      json.entries.push(_getAttributes(entry, PUBLIC_ATTRIBUTES_ENTRY))
    }
  } else {
    json = { error: 'User not found' }
    status = 404
  }

  _renderJson(req, res, status, json)
}

async function userLatestEntry (req, res) {
  let json = {}
  let status = 200

  let user
  if (forms.isId(req.params.user)) {
    user = await userService.findById(req.params.user)
  } else {
    user = await userService.findByName(req.params.user)
  }

  if (user) {
    json = _getAttributes(user, PUBLIC_ATTRIBUTES_USER)

    const entry = await eventService.findLatestUserEntry(user)
    if (entry) {
      json.latest_entry = _getAttributes(await eventService.findLatestUserEntry(user), PUBLIC_ATTRIBUTES_ENTRY)
      json.latest_entry.url = urllib.resolve(config.ROOT_URL, buildUrl(entry, 'entry'))
    }
  } else {
    json = { error: 'User not found' }
    status = 404
  }

  _renderJson(req, res, status, json)
}

function _renderJson (req, res, statusCode, json) {
  res.status(statusCode)
  if (req.query.pretty) {
    res.locals.pageTitle = 'API Preview for ' + req.path
    res.render('api/pretty', { apiPath: req.path, json })
  } else {
    res.end(JSON.stringify(json))
  }
}

function _getAttributes (model, whiteList) {
  let values = {}
  for (let attribute of whiteList) {
    values[attribute] = model.get(attribute)
  }
  return values
}
