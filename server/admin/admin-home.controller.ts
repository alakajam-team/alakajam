import constants from "server/core/constants";
import likeService from "../post/like/like.service";
import postService from "../post/post.service";

/**
 * Edit home announcements
 */
export async function adminHome(req, res) {
  const allPostsCollection = await postService.findPosts({
    specialPostType: constants.SPECIAL_POST_TYPE_ANNOUNCEMENT,
    allowHidden: true,
    allowDrafts: true,
  });
  const draftPosts = allPostsCollection.where({ published_at: null });

  res.render("admin/admin-home", {
    draftPosts,
    publishedPosts: allPostsCollection.difference(draftPosts),
    userLikes: await likeService.findUserLikeInfo(allPostsCollection, res.locals.user),
  });
}
