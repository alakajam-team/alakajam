'use strict'

/**
 * Blog post service.
 *
 * @module services/post-service
 */

const Post = require('../models/post-model')

module.exports = {
  findHomePost
}

/**
 * 
 */
async function findHomePost () {
  let post = await Post.where('special_post_type', 'announcement').fetch()
  if (!post) {
    post = new Post({
      'special_post_type': 'announcement'
    })
  }
  return post
}
