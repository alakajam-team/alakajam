import { CommonLocals } from "server/common.middleware";
import constants from "server/core/constants";
import forms from "server/core/forms";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";

/**
 * Edit home announcements
 */
export async function adminAnnouncements(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  let currentPage = 1;
  if (forms.isId(req.query.p)) {
    currentPage = parseInt(req.query.p, 10);
  }

  const allPostsCollection = await postService.findPosts({
    specialPostType: constants.SPECIAL_POST_TYPE_ANNOUNCEMENT,
    allowHidden: true,
    allowDrafts: true,
    page: currentPage
  });
  const draftPosts = allPostsCollection.filter((post) => !post.get("published_at"));

  res.render("admin/announcements/admin-announcements", {
    draftPosts,
    publishedPosts: allPostsCollection.filter((post) => !draftPosts.includes(post)),
    userLikes: await likeService.findUserLikeInfo(allPostsCollection, res.locals.user),
    currentPage,
    pageCount: allPostsCollection.pagination.pageCount
  });
}
