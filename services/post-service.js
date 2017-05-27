'use strict'

/**
 * Blog post service.
 *
 * @module services/post-service
 */

const Post = require('../models/post-model')
// const Comment = require('../models/comment-model')
const constants = require('../core/constants')
const securityService = require('../services/security-service')

module.exports = {
  isPast,

  findPosts,
  findPostById,

  createPost,
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
 * Creates and persists a new comment.
 * @param  {User} user
 * @param  {Post|Entry} node
 * @param  {string} comment body
 * @return {Comment}
 */
async function createComment (user, node, body) {
  let comment = await node.comments().create({
    user_id: user.get('id'),
    body: body
  })
  await comment.save()
  return comment
}
