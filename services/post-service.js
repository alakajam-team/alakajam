'use strict'

/**
 * Blog post service.
 *
 * @module services/post-service
 */

const Post = require('../models/post-model')
const Comment = require('../models/comment-model')
const constants = require('../core/constants')
const securityService = require('../services/security-service')

module.exports = {
  isPast,
  wasEdited,

  findPosts,
  findPostById,
  findLatestAnnouncement,
  findCommentById,
  findCommentsSortedForDisplay,

  createPost,
  refreshCommentCount,
  createComment
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
 * Finds all posts from a feed (specified through options)
 * @param  {object} options among "specialPostType withDrafts eventId entryId userId"
 * @return {array(Post)}
 */
async function findPosts (options = {}) {
  let postCollection = await Post.query(function (qb) {
    qb = qb.distinct()
    if (options.specialPostType) qb = qb.where('special_post_type', options.specialPostType)
    if (options.eventId) qb = qb.where('event_id', options.eventId)
    if (options.entryId) qb = qb.where('entry_id', options.entryId)
    if (options.guildId) qb = qb.where('guild_id', options.guildId)
    if (options.userId) {
      qb = qb.innerJoin('user_role', 'post.id', 'user_role.node_id')
          .where('user_role.user_id', options.userId)
          .whereIn('permission', securityService.getPermissionsEqualOrAbove(constants.PERMISSION_WRITE))
    }
    if (!options.withDrafts) qb = qb.where('published_at', '<=', new Date())
    return qb
  })
    .orderBy('published_at', 'DESC')
    .fetchAll({withRelated: ['author', 'userRoles']})
  return postCollection
}

async function findPostById (postId) {
  return Post.where('id', postId)
    .fetch({withRelated: ['author', 'userRoles']})
}

async function findLatestAnnouncement () {
  return Post.where('special_post_type', constants.SPECIAL_POST_TYPE_ANNOUNCEMENT)
    .orderBy('published_at', 'DESC')
    .fetch({withRelated: ['author', 'userRoles']})
}

async function findCommentById (commentId) {
  return Comment.where('id', commentId)
    .fetch({withRelated: ['user']})
}

/**
 * Fetchs the comments of the given node, and sorts them by creation date.
 * @param  {Post|Entry} node
 * @return {array(Comment)}
 */
async function findCommentsSortedForDisplay (node) {
  await node.load(['comments', 'comments.user'])
  return node.related('comments').sortBy(comment => comment.get('created_at'))
}

/**
 * Creates and persists a new post, initializing the owner UserRole.
 * @param  {User} user
 * @return {Post}
 */
async function createPost (user) {
  // TODO Better use of Bookshelf API
  let post = new Post()
  post.set('author_user_id', user.get('id'))
  await post.save() // otherwise the user role won't have a node_id
  await post.userRoles().create({
    user_id: user.get('id'),
    user_name: user.get('name'),
    user_title: user.get('title'),
    permission: constants.PERMISSION_MANAGE
  })
  return post
}

/**
 * Creates a new comment.
 * @param  {User} user
 * @param  {Post|Entry} node
 * @param  {string} (optional) comment body
 * @return {Comment}
 */
async function createComment (user, node, body) {
  let comment = await node.comments().create({
    user_id: user.get('id'),
    body: body
  })
  return comment
}

/**
 * Updates the comment count on the given node and saves it.
 * @param {Post|Entry} node
 */
async function refreshCommentCount (node) {
  await node.load('comments')
  let commentCount = node.related('comments').size()
  node.set('comment_count', commentCount)
  await node.save()
}
