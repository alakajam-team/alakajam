'use strict'

/**
 * Notification service.
 *
 * @module services/notification-service
 */

const cache = require('../core/cache')
const eventService = require('../services/event-service')
const postService = require('../services/post-service')

module.exports = {
  countUnreadNotifications
}

async function countUnreadNotifications (user) {
  let userCache = cache.user(user)
  let unreadNotifications = userCache.get('unreadNotifications')
  if (unreadNotifications === undefined) {
    let commentsCollection = await postService.findCommentsToUser(user, { notificationsLastRead: true })
    let invitesCollection = await eventService.findEntryInvitesForUser(user, { notificationsLastRead: true })
    unreadNotifications = commentsCollection.length + invitesCollection.length
    userCache.set('unreadNotifications', unreadNotifications)
  }
  return unreadNotifications
}
