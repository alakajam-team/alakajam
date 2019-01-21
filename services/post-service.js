'use strict'

/**
 * Blog post service.
 *
 * @module services/post-service
 */

const models = require('../core/models')
const constants = require('../core/constants')
const db = require('../core/db')
const cache = require('../core/cache')
const securityService = require('../services/security-service')
const config = require('../config')

const FIRST_PICTURE_REGEXP = /(?:!\[.*?\]\((.*?)\)|src="([^"]+)")/

module.exports = {
  isPast,
  wasEdited,
  getFirstPicture,

  findPosts,
  findPostById,
  findPost,
  findLatestAnnouncement,
  findCommentById,
  findCommentsSortedForDisplay,
  findCommentsByUser,
  findCommentsByUserAndEvent,
  findCommentsToUser,
  findOwnAnonymousCommentIds,
  isOwnAnonymousComment,

  createPost,
  refreshCommentCount,
  deletePost,
  createComment,
  deleteComment
}

/**
 * Indicates if a date is already past
 * @param  {number}  time
 * @return {Boolean}
 */
function isPast (time) {
  return time && (new Date().getTime() - time) > 0
}

/**
 * Tells whether a model has been edited > 1 hour after its creation
 * @param  {Model} model Any model with timestamps
 * @return {bool}
 */
function wasEdited (model) {
  return model.get('updated_at') - model.get('created_at') > 3600 * 1000
}

/**
 * Finds the URL of the first picture in the body, if any.
 * Quick and not-completely-reliable implementation.
 * @param {Model} model Any model with a body
 */
function getFirstPicture (model) {
  let matches = FIRST_PICTURE_REGEXP.exec(model.get('body'))
  if (matches) {
    return matches[1] || matches[2] // Markdown capture OR HTML tag capture
  }
  return null
}

/**
 * Finds all posts from a feed (specified through options)
 * @param  {object} options among "specialPostType allowHidden allowDrafts eventId entryId userId"
 * @return {array(Post)}
 */
async function findPosts (options = {}) {
  let postCollection = await models.Post
  postCollection = postCollection.query(function (qb) {
    if (options.specialPostType !== undefined) qb = qb.where('special_post_type', options.specialPostType)
    if (!options.allowHidden) {
      qb.where(function (qb) {
        qb = qb.where('special_post_type', '<>', 'hidden')
        if (!options.specialPostType) {
          qb.orWhere('special_post_type', null)
        }
      })
    } else {
      qb.orWhere('special_post_type', 'hidden')
    }

    if (options.eventId) qb = qb.where('event_id', options.eventId)
    if (options.entryId) qb = qb.where('entry_id', options.entryId)
    if (options.userId) {
      qb = qb.innerJoin('user_role', 'post.id', 'user_role.node_id')
        .where({
          'user_role.user_id': options.userId,
          'user_role.node_type': 'post'
        })
        .whereIn('permission', securityService.getPermissionsEqualOrAbove(constants.PERMISSION_WRITE))
    }

    if (!options.allowDrafts) qb = qb.where('published_at', '<=', new Date())
    return qb
  })
  postCollection.orderBy('published_at', 'DESC')

  return postCollection.fetchPage({
    pageSize: 10,
    page: options.page,
    withRelated: ['author', 'userRoles']
  })
}

async function findPostById (postId) {
  return models.Post.where('id', postId)
    .fetch({withRelated: ['author', 'userRoles', 'event', 'entry', 'entry.userRoles']})
}

/**
 * Finds one post
 * @param  {object} options among "id name userId eventId specialPostType allowDrafts"
 * @return {Post}
 */
async function findPost (options = {}) {
  let query = models.Post
  if (options.id) query = query.where('id', options.id)
  if (options.name) query = query.where('name', options.name)
  if (options.eventId) query = query.where('event_id', options.eventId)
  if (options.userId) query = query.where('author_user_id', options.userId)
  if (options.specialPostType !== undefined) query = query.where('special_post_type', options.specialPostType)
  if (!options.allowDrafts) query = query.where('published_at', '<=', new Date())
  return query
    .orderBy('published_at', 'desc')
    .fetch({withRelated: ['author', 'userRoles']})
}

/**
 * Finds the latest announcement
 * @param  {Object} options among "eventId"
 * @return {Post}
 */
async function findLatestAnnouncement (options = {}) {
  let query = models.Post
    .where('special_post_type', constants.SPECIAL_POST_TYPE_ANNOUNCEMENT)
    .where('published_at', '<=', new Date())
  if (options.eventId) {
    query = query.where('event_id', options.eventId)
  }
  return query.orderBy('published_at', 'DESC')
    .fetch({withRelated: ['author', 'userRoles']})
}

async function findCommentById (commentId) {
  return models.Comment.where('id', commentId)
    .fetch({withRelated: ['user']})
}

/**
 * Fetches the comments of the given node, and sorts them by creation date.
 * @param  {Post|Entry} node
 * @return {array(Comment)}
 */
async function findCommentsSortedForDisplay (node) {
  // TODO Actual SQL query
  await node.load(['comments', 'comments.user'])
  return node.related('comments').sortBy(comment => comment.get('created_at'))
}

/**
 * Fetches all comments written by an user
 * @param  {User} user
 * @return {Collection(Comment)}
 */
async function findCommentsByUser (user) {
  return models.Comment.where('user_id', user.id)
    .orderBy('created_at', 'DESC')
    .fetchAll({withRelated: ['user', 'node']})
}

/**
 * Fetches all comments written by an user on an event's entries.
 * @param  {integer} userId
 * @param  {integer} eventId
 * @return {Collection(Comment)}
 */
async function findCommentsByUserAndEvent (userId, eventId) {
  return models.Comment.query(function (qb) {
    qb.innerJoin('entry', 'comment.node_id', 'entry.id')
      .where({
        'user_id': userId,
        'node_type': 'entry',
        'entry.event_id': eventId
      })
  })
    .fetchAll()
}

/**
 * Fetches all comments interesting for an user.
 * This includes both "@"-mentions and all comments to the user posts & entries.
 * @param  {User} user
 * @param  {Object} options among "notificationsLastRead"
 * @return {Collection(Comment)}
 */
async function findCommentsToUser (user, options = {}) {
  // let's view any notifs in the last x mins

  let notificationsLastRead = new Date(0)
  if (options.notificationsLastRead && user.get('notifications_last_read') !== undefined) {
    notificationsLastRead = new Date(user.get('notifications_last_read'))
  }
  return models.Comment.query(function (qb) {
    qb = qb.distinct()
      .leftJoin('user_role', function () {
        this.on('comment.node_id', '=', 'user_role.node_id')
          .andOn('comment.node_type', '=', 'user_role.node_type')
      })
      .where('user_role.user_id', user.id)
      .andWhere('comment.user_id', '<>', user.id)
      .andWhere('comment.updated_at', '>', notificationsLastRead)
      .andWhere('comment.updated_at', '>', db.knex.raw('user_role.created_at'))
      .orWhere('body', (config.DB_TYPE === 'sqlite3' ? 'like' : 'ilike'),
        '%@' + user.get('name') + '%') // TODO Use special mention/notification table filled on write
  })
    .where('comment.updated_at', '>', notificationsLastRead)
    .orderBy('created_at', 'DESC')
    .fetchAll({withRelated: ['user', 'node']})
}

/**
 * Retrieves an array of anonmous comment IDs a user wrote on a node
 * @param  {User} user
 * @param  {number} nodeId
 * @param  {string} nodeType
 * @return {array(number)}
 */
async function findOwnAnonymousCommentIds (user, nodeId, nodeType) {
  let results = db.knex('anonymous_comment_user')
    .select('anonymous_comment_user.comment_id')
    .leftJoin('comment', 'comment.id', 'anonymous_comment_user.comment_id')
    .where({
      'anonymous_comment_user.user_id': user.get('id'),
      'comment.node_id': nodeId,
      'comment.node_type': nodeType
    })
  return results.map(row => row.comment_id)
}

/**
 * Checks whether an anonymous comment belongs to an user
 * @param  {Comment}  comment
 * @param  {User}  user
 * @return {boolean}
 */
async function isOwnAnonymousComment (comment, user) {
  if (comment.get('user_id') === constants.ANONYMOUS_USER_ID) {
    let result = await db.knex('anonyous_comment_user')
      .count()
      .where({
        comment_id: comment.get('id'),
        user_id: user.get('id')
      })
    return parseInt(result[0].count) > 0
  } else {
    return false
  }
}

/**
 * Creates and persists a new post, initializing the owner UserRole.
 * @param  {User} user
 * @param  {number} eventId the optional ID of an event to associate with.
 * @return {Post}
 */
async function createPost (user, eventId = null) {
  // TODO Better use of Bookshelf API
  let post = new models.Post()
  post.set({
    'author_user_id': user.get('id'),
    'name': '',
    'title': ''
  })
  await post.save() // otherwise the user role won't have a node_id
  await post.userRoles().create({
    user_id: user.get('id'),
    user_name: user.get('name'),
    user_title: user.get('title'),
    event_id: eventId,
    permission: constants.PERMISSION_MANAGE
  })
  return post
}

/**
 * Creates and persists a new comment.
 * @param  {User} user
 * @param  {Post|Entry} node
 * @param  {string} (optional) comment body
 * @param  {Boolean} requestAnonymous (optional)
 * @return {Comment}
 */
async function createComment (user, node, body, requestAnonymous = false) {
  let comment = await node.comments().create({
    user_id: user.get('id'),
    body: body
  })

  if (requestAnonymous && !user.get('disallow_anonymous') && node.get('allow_anonymous')) {
    comment.set('user_id', -1)
    await comment.save() // save the comment now to get an ID
    await db.knex('anonymous_comment_user').insert({
      'comment_id': comment.get('id'),
      'user_id': user.get('id')
    })
  } else {
    await comment.save()
  }

  return comment
}

/**
 * Updates the comment count on the given node and saves it.
 * @param {Post|Entry} node
 */
async function refreshCommentCount (node) {
  await node.load('comments')
  let commentCount = node.related('comments').size()
  await node.save({ 'comment_count': commentCount }, { patch: true })
}

/**
 * Deletes the given post
 * @param {Post} post
 * @return {void}
 */
async function deletePost (post) {
  await post.load(['userRoles.user', 'comments.user'])
  post.related('userRoles').each(function (userRole) {
    cache.user(userRole.related('user')).del('latestPostsCollection')
    userRole.destroy()
  })
  post.related('comments').each(function (comment) {
    cache.user(comment.related('user')).del('byUserCollection')
    comment.destroy()
  })

  await post.destroy()
}

/**
 * Deletes the given comment
 * @param  {Comment} comment
 * @return {void}
 */
async function deleteComment (comment) {
  // In case it was an anonymous comment, delete the associated user link
  await db.knex('anonymous_comment_user')
    .where('comment_id', comment.get('id'))
    .del()

  await comment.destroy()
}
