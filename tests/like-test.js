'use strict'

const testServer = require('./support/test-server.js')
const assert = require('assert')

before(testServer.init)

describe('like', async function () {
  it('users should be able to like/unlike posts', async function () {
    const userService = require('../services/user-service')
    const postService = require('../services/post-service')
    const likeService = require('../services/like-service')
    const enums = require('../core/enums')

    let user1 = await userService.register('user1@example.com', 'user1', 'password')
    let user2 = await userService.register('user2@example.com', 'user2', 'password')

    // Like
    let anyLikeType = Object.keys(enums.LIKES)[0]
    let post = await postService.createPost(user1)
    let like = await likeService.like(post, user2.get('id'), anyLikeType)
    post = await postService.findPostById(post.get('id'))

    assert.equal(like.get('user_id'), user2.get('id'))
    assert.equal(like.get('type'), anyLikeType)
    assert.equal(like.get('node_type'), post.tableName)
    assert.equal(like.get('node_id'), post.get('id'))
    assert.equal(post.get('like_count'), 1)
    assert.equal(Object.keys(post.get('like_details')).length, 1)
    assert.equal(post.get('like_details')[anyLikeType], 1)

    // Unlike
    await likeService.unlike(post, user2.get('id'))
    post = await postService.findPostById(post.get('id'))
    assert.equal(Object.keys(post.get('like_details')).length, 0)
  })
})
