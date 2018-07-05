'use strict'

/**
 * Like service.
 *
 * @module services/like-service
 */

const models = require('../core/models')
const enums = require('../core/enums')

module.exports = {
  isValidLikeType,
  getLike,

  like,
  unlike
}

function isValidLikeType (likeType) {
  return !!enums.LIKES[likeType]
}

async function getLike (node, userId) {
  return models.Like.where({
    node_type: node.tableName,
    node_id: node.get('id'),
    user_id: userId
  }).fetch()
}

async function like (node, userId, likeType) {
  if (isValidLikeType(likeType)) {
    let addLikeType = false
    let removeLikeType = false

    let like = await getLike(node, userId)
    if (!like) {
      addLikeType = likeType
      like = await node.likes().create({
        user_id: userId,
        type: likeType
      })
    } else if (like.get('type') !== likeType) {
      removeLikeType = like.get('type')
      addLikeType = likeType
      like.set('type', likeType)
      await like.save()
    }

    await _refreshNodeLikes(node, addLikeType, removeLikeType)
    return like
  }
}

async function unlike (node, userId) {
  let like = await getLike(node, userId)
  if (like) {
    let likeType = like.get('type')
    await like.destroy()
    await _refreshNodeLikes(node, false, likeType)
  }
}

async function _refreshNodeLikes (node, addLikeType, removeLikeType) {
  if (addLikeType || removeLikeType) {
    let likeCount = node.get('like_count') || 0
    let likeDetails = node.get('like_details') || {} // {type: count}

    likeCount += (addLikeType ? 1 : 0) + (removeLikeType ? -1 : 0)
    if (removeLikeType && likeDetails[removeLikeType]) {
      likeDetails[removeLikeType]--
      if (likeDetails[removeLikeType] === 0) {
        delete likeDetails[removeLikeType]
      }
    }
    if (addLikeType) {
      if (!likeDetails[addLikeType]) {
        likeDetails[addLikeType] = 0
      }
      likeDetails[addLikeType]++
    }

    node.set({
      like_count: likeCount,
      like_details: likeDetails
    })
    await node.save()
  }
}
