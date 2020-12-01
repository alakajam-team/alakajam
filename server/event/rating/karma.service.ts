import { BookshelfCollection, BookshelfModel } from "bookshelf";

export class KarmaService {

  public async refreshCommentKarma(comment: BookshelfModel) {
    await comment.load(["node.comments", "node.userRoles"]);

    let isTeamMember = false;
    const entry = comment.related<BookshelfModel>("node");
    const entryUserRoles = entry.related<BookshelfCollection>("userRoles");
    for (const userRole of entryUserRoles.models) {
      if (userRole.get("user_id") === comment.get("user_id")) {
        isTeamMember = true;
        break;
      }
    }

    let adjustedScore = 0;
    if (!isTeamMember) {
      const rawScore = this.computeRawCommentKarma(comment);

      let previousCommentsScore = 0;
      const entryComments = entry.related<BookshelfCollection>("comments");
      for (const entryComment of entryComments.models) {
        if (entryComment.get("user_id") === comment.get("user_id") && entryComment.get("id") !== comment.get("id")) {
          previousCommentsScore += entryComment.get("karma");
        }
      }
      adjustedScore = Math.max(0, Math.min(rawScore, 3 - previousCommentsScore));
    }

    comment.set("karma", adjustedScore);
  }

  /**
   * Refreshes the scores of all the comments written by an user on an entry.
   * Useful to detect side-effects of a user modifying or deleting a comment.
   * @param {integer} userId The user id of the modified comment
   * @param {Post|Entry} node
   */
  public async refreshUserCommentKarmaOnNode(node, userId) {
    await node.load(["comments", "userRoles"]);
    let isTeamMember = false;

    const entryUserRoles = node.related("userRoles");
    for (const userRole of entryUserRoles.models) {
      if (userRole.get("user_id") === userId) {
        isTeamMember = true;
        break;
      }
    }

    if (!isTeamMember) {
      let previousCommentsScore = 0;
      const entryComments = node.related("comments");
      for (const comment of entryComments.models) {
        if (comment.get("user_id") === userId) {
          let adjustedScore = 0;
          if (previousCommentsScore < 3) {
            const rawScore = this.computeRawCommentKarma(comment);
            adjustedScore = Math.max(0, Math.min(rawScore, 3 - previousCommentsScore));
            previousCommentsScore += adjustedScore;
          }
          comment.set("karma", adjustedScore);
          await comment.save();
        }
      }
    }
  }

  private computeRawCommentKarma(comment: BookshelfModel): number {
    const commentLength = comment.get("body").length;
    if (commentLength > 300) { // Elaborate comments
      return 3;
    } else if (commentLength > 100) { // Interesting comments
      return 2;
    } else { // Short comments
      return 1;
    }
  }

}

export default new KarmaService();
