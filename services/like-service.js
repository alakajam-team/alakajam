'use strict'

/**
 * Like service.
 *
 * @module services/like-service
 */

const models = require('../core/models')
const enums = require('../core/enums')
const db = require('../core/db')

module.exports = {
  isValidLikeType,
  findUserLikeInfo,
  findLike,

  like,
  unlike
}

function isValidLikeType (likeType) {
  return !!enums.LIKES[likeType]
}

/**
 * Get all user likes on a set of nodes (can contain holes).
 * LIMITATIONS:
 * - All nodes must be of the same model type.
 * - Make sure the nodes array size has a reasonable max value or the SQL might overflow (IN clause).
 * @returns {object} An object where keys are node IDs, and values are the type of like.
 */
async function findUserLikeInfo (nodes, user) {
  nodes = nodes.filter(node => !!node)
  if (nodes.length === 0 || !user) {
    return {}
  }

  let likeData = await db.knex('like')
    .select('node_id', 'type')
    .where({
      node_type: nodes[0].tableName,
      user_id: user.get('id')
    })
    .where('node_id', 'IN', nodes.map(node => node.get('id')))

  let result = {}
  likeData.forEach(like => {
    result[like['node_id']] = like['type']
  })
  return result
}

async function findLike (node, userId) {
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

    let like = await findLike(node, userId)
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
  let like = await findLike(node, userId)
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
