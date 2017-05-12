'use strict'

/**
 * Blog post service.
 *
 * @module services/post-service
 */

const Post = require('../models/post-model')
const securityService = require('../services/security-service')

module.exports = {
  findAnnouncements,
  findPostById,
  findUserPosts,

  createPost
}

/**
 * 
 */
async function findAnnouncements () {
  let postCollection = await Post.where('special_post_type', 'announcement')
    .orderBy('published_at', 'DESC')
    .fetchAll({withRelated: ['author', 'userRoles']})
  return postCollection.models
}

async function findPostById (postId) {
  return await Post.where('id', postId)
    .fetch({withRelated: ['author', 'userRoles']})
}

async function findUserPosts (userId) {
  let postCollection = await Post.query((query) => {
      // TODO Better use of Bookshelf API
      query.innerJoin('user_role', 'post.id', 'user_role.node_uuid')
        .where('user_role.user_uuid', userId)
    })
    .orderBy('published_at', 'DESC')
    .fetchAll({ withRelated: ['author', 'userRoles'] })
  return postCollection.models
}

/**
 * Creates and persists a new post, initializing the owner UserRole.
 * @param  {User} user 
 * @return {Post}
 */
async function createPost (user) {
  // TODO Better use of Bookshelf API
  let post = new Post()
  post.set('author_user_id', user.get('uuid'))
  await post.save() // otherwise the user role won't have a node_uuid
  await post.userRoles().create({
    user_uuid: user.get('uuid'),
    user_name: user.get('name'),
    user_title: user.get('title'),
    permission: securityService.PERMISSION_MANAGE
  })
  return post
}