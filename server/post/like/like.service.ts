import { BookshelfModel, NodeBookshelfModel } from "bookshelf";
import db from "server/core/db";
import enums from "server/core/enums";
import * as models from "server/core/models";

export class LikeService {

  public isValidLikeType(likeType: string): boolean {
    return !!enums.LIKES[likeType];
  }

  /**
   * Get all user likes on a set of nodes
   * LIMITATIONS:
   * - All nodes must be of the same model type.
   * - Make sure the nodes array size has a reasonable max value or the SQL might overflow (IN clause).
   * @param nodes node array, can contain holes
   * @param user
   */
  public async findUserLikeInfo(nodes: NodeBookshelfModel[], user: BookshelfModel): Promise<Record<number, string>> {
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

    const result: Record<number, string> = {};
    likeData.forEach((likeRow) => {
      result[likeRow.node_id] = likeRow.type;
    });
    return result;
  }

  public async findLike(node: NodeBookshelfModel, userId: number): Promise<BookshelfModel> {
    return models.Like.where({
      node_type: node.tableName,
      node_id: node.get("id"),
      user_id: userId,
    }).fetch();
  }

  public async like(node: NodeBookshelfModel, userId: number, likeType: string): Promise<BookshelfModel> {
    if (this.isValidLikeType(likeType)) {
      let addLikeType: string;
      let removeLikeType: string;

      let likeModel = await this.findLike(node, userId);
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

      await this.refreshNodeLikes(node, addLikeType, removeLikeType);
      return likeModel;
    }
  }

  public async unlike(node: NodeBookshelfModel, userId: number): Promise<void> {
    const likeModel = await this.findLike(node, userId);
    if (likeModel) {
      const likeType = likeModel.get("type");
      await likeModel.destroy();
      await this.refreshNodeLikes(node, undefined, likeType);
    }
  }

  private async refreshNodeLikes(
    node: NodeBookshelfModel,
    addLikeType?: string,
    removeLikeType?: string): Promise<void> {
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

}

export default new LikeService();
