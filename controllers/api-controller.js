'use strict'

/**
 * JSON API
 *
 * @module controllers/api-controller
 */

const moment = require('moment')
const url = require('url')
const lodash = require('lodash')
const config = require('../config')
const forms = require('../core/forms')
const enums = require('../core/enums')
const eventService = require('../services/event-service')
const eventThemeService = require('../services/event-theme-service')
const userService = require('../services/user-service')
const buildUrl = require('./templating').buildUrl

const PUBLIC_ATTRIBUTES_EVENT = ['id', 'name', 'title', 'display_dates', 'display_theme', 'status', 'status_theme', 'status_entry', 'status_results', 'countdown_config']
const PUBLIC_ATTRIBUTES_ENTRY = ['id', 'event_id', 'event_name', 'name', 'title', 'description', 'links', 'pictures', 'category', 'comment_count', 'karma', 'division']
const PUBLIC_ATTRIBUTES_ENTRY_DETAILS = ['body', 'optouts', 'rating_count']
const PUBLIC_ATTRIBUTES_ENTRY_DETAILS_RESULTS = ['rating_1', 'rating_2', 'rating_3', 'rating_4', 'rating_5', 'rating_6', 'ranking_1', 'ranking_2', 'ranking_3', 'ranking_4', 'ranking_5', 'ranking_6']
const PUBLIC_ATTRIBUTES_USER = ['id', 'name', 'title', 'avatar', 'is_mod', 'is_admin']
const PUBLIC_ATTRIBUTES_COMMENT = ['id', 'user_id', 'parent_id', 'body', 'created_at', 'updated_at']

const DETAILED_ENTRY_OPTIONS = { withRelated: ['comments', 'details', 'userRoles.user', 'event'] }

module.exports = {
  featuredEvent,
  eventTimeline,
  event,
  eventShortlist,
  entry,
  user,
  userLatestEntry,
  userSearch
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
 * Event timeline
 */
async function eventTimeline (req, res) {
  let json = {}
  let status = 200

  let page = 0
  try {
    if (req.query.page) {
      page = Math.max(0, parseInt(req.query.page))
    }
  } catch (e) {
    json = { error: 'Invalid page number' }
    status = 401
  }

  let events = await eventService.findEvents({
    pageSize: 10,
    page
  })

  json = events.map(event => {
    let eventJson = _getAttributes(event, PUBLIC_ATTRIBUTES_EVENT)
    eventJson.url = url.resolve(config.ROOT_URL, buildUrl(event, 'event'))
    return eventJson
  })
  _renderJson(req, res, status, json)
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
    json.url = url.resolve(config.ROOT_URL, buildUrl(event, 'event'))

    if (json.countdown_config && json.countdown_config.date) {
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
              result += days + ' day' + (days !== 1 ? 's' : '') + ', '
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
 * Data about the theme shortlist of an event
 */
async function eventShortlist (req, res) {
  let json = {}
  let status = 200

  let event
  if (req.params.event && forms.isId(req.params.event)) {
    event = await eventService.findEventById(req.params.event)
  } else {
    event = await eventService.findEventByName(req.params.event)
  }

  if (event) {
    let shortlist = await eventThemeService.findShortlist(event)
    if (shortlist.length > 0) {
      let eliminatedThemes = eventThemeService.computeEliminatedShortlistThemes(event)
      if (event.get('status_theme') === enums.EVENT.STATUS_THEME.RESULTS) {
        eliminatedThemes = 9
      }

      // Build data
      let rawShortlist = []
      shortlist.chain()
        .forEach(function (theme, i) {
          let rank = i + 1
          let eliminated = eliminatedThemes > 10 - rank
          rawShortlist.push({
            title: theme.get('title'),
            eliminated,
            ranking: eliminated ? rank : undefined
          })
        })
        .value()

      // Obfuscate order for active themes
      let active = rawShortlist.filter(themeInfo => !themeInfo.eliminated)
      let eliminated = rawShortlist.filter(themeInfo => themeInfo.eliminated)
      json.shortlist = lodash.shuffle(active).concat(eliminated)
      json.nextElimination = eventThemeService.computeNextShortlistEliminationTime(event)
    } else {
      json = { error: 'Event does not have a theme shortlist' }
      status = 403
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
    let entry = await eventService.findEntryById(req.params.entry, DETAILED_ENTRY_OPTIONS)

    if (entry) {
      json = _getDetailedEntryJson(entry)
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
 * Transforms an entry model into detailed JSON info
 * @param  {Entry} entry must be fetched with DETAILED_ENTRY_OPTIONS
 * @return {object} json
 */
function _getDetailedEntryJson (entry) {
  let json = _getAttributes(entry, PUBLIC_ATTRIBUTES_ENTRY)
  json.url = url.resolve(config.ROOT_URL, buildUrl(entry, 'entry'))

  let entryDetails = entry.related('details')
  Object.assign(json, _getAttributes(entryDetails, PUBLIC_ATTRIBUTES_ENTRY_DETAILS))

  let event = entry.related('event')
  if (event.get('status_results') === enums.EVENT.STATUS_RESULTS.RESULTS) {
    json.results = _getAttributes(entryDetails, PUBLIC_ATTRIBUTES_ENTRY_DETAILS_RESULTS)
  }

  json.comments = []
  for (let comment of entry.related('comments').models) {
    json.comments.push(_getAttributes(comment, PUBLIC_ATTRIBUTES_COMMENT))
  }

  json.users = []
  for (let user of entry.related('userRoles').models) {
    json.users.push(_getAttributes(user.related('user'), PUBLIC_ATTRIBUTES_USER))
  }

  return json
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
    json.url = url.resolve(config.ROOT_URL, buildUrl(user, 'user'))

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
      json.latest_entry = _getDetailedEntryJson(await eventService.findLatestUserEntry(user, DETAILED_ENTRY_OPTIONS))
      json.latest_entry.url = url.resolve(config.ROOT_URL, buildUrl(entry, 'entry'))
    }
  } else {
    json = { error: 'User not found' }
    status = 404
  }

  _renderJson(req, res, status, json)
}

async function userSearch (req, res) {
  let json = {}
  let status = 200

  let page = 0
  try {
    if (req.query.page) {
      page = Math.max(0, parseInt(req.query.page))
    }
  } catch (e) {
    json = { error: 'Invalid page number' }
    status = 401
  }

  if (!json.error) {
    let users = await userService.findUsers({
      search: req.query.title,
      pageSize: 30,
      page
    })

    json.users = []
    for (let user of users.models) {
      let userJson = _getAttributes(user, PUBLIC_ATTRIBUTES_USER)
      userJson.url = url.resolve(config.ROOT_URL, buildUrl(user, 'user'))
      json.users.push(userJson)
    }
  }

  _renderJson(req, res, status, json)
}

function _renderJson (req, res, statusCode, json) {
  res.status(statusCode)
  if (req.query.pretty) {
    res.locals.pageTitle = 'API Preview for ' + req.path
    res.render('api/pretty', { apiPath: req.path, json })
  } else {
    res.json(json)
  }
}

function _getAttributes (model, whiteList) {
  let values = {}
  for (let attribute of whiteList) {
    values[attribute] = model.get(attribute)
  }
  return values
}
