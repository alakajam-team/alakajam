import { Request } from "express";
import { CommonLocals } from "server/common.middleware";
import constants from "server/core/constants";
import forms from "server/core/forms";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomResponse } from "server/types";

/**
 * Edit home announcements
 */
export async function adminAnnouncements(req: Request, res: CustomResponse<CommonLocals>) {
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
  const draftPosts = allPostsCollection.where({ published_at: null });

  res.render("admin/announcements/admin-announcements", {
    draftPosts,
    publishedPosts: allPostsCollection.difference(draftPosts),
    userLikes: await likeService.findUserLikeInfo(allPostsCollection, res.locals.user),
    currentPage,
    pageCount: allPostsCollection.pagination.pageCount
  });
}
