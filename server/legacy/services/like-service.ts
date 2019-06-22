
/**
 * Like service.
 *
 * @module services/like-service
 */

import db from "../../core/db";
import enums from "../../core/enums";
import * as models from "../../core/models";

export default {
  isValidLikeType,
  findUserLikeInfo,
  findLike,

  like,
  unlike,
};

function isValidLikeType(likeType) {
  return !!enums.LIKES[likeType];
}

/**
 * Get all user likes on a set of nodes (can contain holes).
 * LIMITATIONS:
 * - All nodes must be of the same model type.
 * - Make sure the nodes array size has a reasonable max value or the SQL might overflow (IN clause).
 * @returns {object} An object where keys are node IDs, and values are the type of like.
 */
async function findUserLikeInfo(nodes, user) {
  nodes = nodes.filter((node) => !!node);
  if (nodes.length === 0 || !user) {
    return {};
  }

  const likeData = await db.knex("like")
    .select("node_id", "type")
    .where({
      node_type: nodes[0].tableName,
      user_id: user.get("id"),
    })
    .where("node_id", "IN", nodes.map((node) => node.get("id")));

  const result = {};
  likeData.forEach((likeRow) => {
    result[likeRow.node_id] = likeRow.type;
  });
  return result;
}

async function findLike(node, userId) {
  return models.Like.where({
    node_type: node.tableName,
    node_id: node.get("id"),
    user_id: userId,
  }).fetch();
}

async function like(node, userId, likeType) {
  if (isValidLikeType(likeType)) {
    let addLikeType = false;
    let removeLikeType = false;

    let likeModel = await findLike(node, userId);
    if (!likeModel) {
      addLikeType = likeType;
      likeModel = await node.likes().create({
        user_id: userId,
        type: likeType,
      });
    } else if (likeModel.get("type") !== likeType) {
      removeLikeType = likeModel.get("type");
      addLikeType = likeType;
      likeModel.set("type", likeType);
      await likeModel.save();
    }

    await _refreshNodeLikes(node, addLikeType, removeLikeType);
    return likeModel;
  }
}

async function unlike(node, userId) {
  const likeModel = await findLike(node, userId);
  if (likeModel) {
    const likeType = likeModel.get("type");
    await likeModel.destroy();
    await _refreshNodeLikes(node, false, likeType);
  }
}

async function _refreshNodeLikes(node, addLikeType, removeLikeType) {
  if (addLikeType || removeLikeType) {
    // Update like details
    const likeDetails = node.get("like_details") || {}; // {type: count}
    if (removeLikeType && likeDetails[removeLikeType]) {
      likeDetails[removeLikeType]--;
      if (likeDetails[removeLikeType] === 0) {
        delete likeDetails[removeLikeType];
      }
    }
    if (addLikeType) {
      if (!likeDetails[addLikeType]) {
        likeDetails[addLikeType] = 0;
      }
      likeDetails[addLikeType]++;
    }

    // Recompute like count
    let likeCount = node.get("like_count");
    if ((!addLikeType) !== (!removeLikeType)) {
      likeCount = await models.Like.where({
        node_type: node.tableName,
        node_id: node.get("id"),
      }).count();
    }

    // Update node
    node.set({
      like_count: likeCount,
      like_details: likeDetails,
    });
    await node.save();
  }
}
