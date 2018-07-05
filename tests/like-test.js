'use strict'

const testServer = require('./support/test-server.js')
const assert = require('assert')

before(testServer.init)
describe('like', async function () {
  it('users should be able to like/unlike posts', async function () {
    const likeService = require('../services/like-service')
    const postService = require('../services/post-service')

    let { user2Id, anyLikeType, post1 } = await initLikeSamples()

    // Like
    let like = await likeService.like(post1, user2Id, anyLikeType)
    post1 = await postService.findPostById(post1.get('id'))

    assert.equal(like.get('user_id'), user2Id)
    assert.equal(like.get('type'), anyLikeType)
    assert.equal(like.get('node_type'), post1.tableName)
    assert.equal(like.get('node_id'), post1.get('id'))
    assert.equal(post1.get('like_count'), 1)
    assert.equal(Object.keys(post1.get('like_details')).length, 1)
    assert.equal(post1.get('like_details')[anyLikeType], 1)

    // Unlike
    await likeService.unlike(post1, user2Id)
    post1 = await postService.findPostById(post1.get('id'))
    assert.equal(Object.keys(post1.get('like_details')).length, 0)
  })

  it('retrieving user likes should work as expected', async function () {
    const likeService = require('../services/like-service')

    let { user2, user2Id, anyLikeType, post1, post2 } = await initLikeSamples()

    await likeService.like(post1, user2Id, anyLikeType)
    await likeService.like(post2, user2Id, anyLikeType)
    let likeInfo = await likeService.findUserLikeInfo([post1, post2], 'post', user2)

    assert.equal(Object.keys(likeInfo).length, 2)
    assert.equal(likeInfo[post1.get('id')], anyLikeType)
    assert.equal(likeInfo[post2.get('id')], anyLikeType)
  })
})

async function initLikeSamples () {
  const userService = require('../services/user-service')
  const postService = require('../services/post-service')
  const enums = require('../core/enums')

  // Delete
  let user1 = await userService.findByName('user1')
  let user2 = await userService.findByName('user2')
  if (user1) await userService.deleteUser(user1)
  if (user2) await userService.deleteUser(user2)

  // Create
  user1 = await userService.register('user1@example.com', 'user1', 'password')
  user2 = await userService.register('user2@example.com', 'user2', 'password')
  let post1 = await postService.createPost(user1)
  let post2 = await postService.createPost(user2)
  let anyLikeType = Object.keys(enums.LIKES)[0]

  return { user1, user1Id: user1.get('id'), user2, user2Id: user2.get('id'), anyLikeType, post1, post2 }
}
