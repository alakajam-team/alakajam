'use strict'

/**
 * Blog post service.
 *
 * @module services/post-service
 */

const Post = require('../models/post-model')
const securityService = require('../services/security-service')

module.exports = {
  isPast,

  findAnnouncements,
  findPostById,
  findUserPosts,

  createPost
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
 * Finds all announcement posts
 * @param  {object} evenDrafts
 * @return {array[Post]}
 */
async function findAnnouncements (options = {}) {
  let postCollection = await Post.query(function (qb) {
    qb = qb.where('special_post_type', 'announcement')
    if (!options.withDrafts) {
      qb = qb.where('published_at', '<=', new Date())
    }
    return qb
  })
    .orderBy('published_at', 'DESC')
    .fetchAll({withRelated: ['author', 'userRoles']})
  return postCollection
}

async function findPostById (postId) {
  return await Post.where('id', postId)
    .fetch({withRelated: ['author', 'userRoles']})
}

async function findUserPosts (userId) {
  let postCollection = await Post.query((qb) => {
      // TODO Better use of Bookshelf API
    qb.innerJoin('user_role', 'post.id', 'user_role.node_id')
        .where('user_role.user_id', userId)
        .where('published_at', '<=', new Date())
  })
    .orderBy('published_at', 'DESC')
    .fetchAll({ withRelated: ['author', 'userRoles'] })
  return postCollection
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
    permission: securityService.PERMISSION_MANAGE
  })
  return post
}
