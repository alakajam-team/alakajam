'use strict'

/**
 * Event pages
 *
 * @module controllers/event-controller
 */

const eventService = require('../services/event-service')
const postService = require('../services/post-service')

module.exports = {
  eventMiddleware,

  viewEventPosts,
  viewEventGames,

  editEvent
}

/**
 * Fetches the event & optionally the user's entry
 */
async function eventMiddleware (req, res, next) {
  let event = await eventService.findEventByName(req.params.eventName)
  res.locals.event = event
  if (!event) {
    res.errorPage(404, 'Event not found')
  } else {
    if (event && res.locals.user) {
      let userEntry = await eventService.findUserEntryForEvent(res.locals.user, event.get('id'))
      res.locals.userEntry = userEntry
    }
    next()
  }
}

/**
 * Browse event posts
 */
async function viewEventPosts (req, res) {
  let userPost
  if (res.locals.user) {
    let userPosts = await postService.findPosts({
      userId: res.locals.user.id,
      eventId: res.locals.event.id
    })
    userPost = (userPosts.models.length > 0) ? userPosts.models[0] : undefined
  }

  res.render('event/view-event-posts', {
    userPost: userPost,
    posts: await postService.findPosts({
      eventId: res.locals.event.get('id')
    })
  })
}

/**
 * Browse event games
 */
async function viewEventGames (req, res) {
  res.render('event/view-event-games')
}

async function editEvent (req, res) {
  res.render('event/edit-event')
}
