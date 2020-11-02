import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import constants from "server/core/constants";
import forms from "server/core/forms";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import { AdminBaseContext } from "../admin.base";

export interface AdminAnnouncementContext extends AdminBaseContext {
  draftPosts: BookshelfModel[];
  publishedPosts: BookshelfModel[];
  userLikes: Record<number, string>;
  currentPage: number;
  pageCount: number;
}

/**
 * Edit home announcements
 */
export async function adminAnnouncements(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  let currentPage = 1;
  if (forms.isId(req.query.p)) {
    currentPage = forms.parseInt(req.query.p.toString());
  }

  const allPostsCollection = await postService.findPosts({
    specialPostType: constants.SPECIAL_POST_TYPE_ANNOUNCEMENT,
    allowHidden: true,
    allowDrafts: true,
    page: currentPage
  });
  const draftPosts = allPostsCollection.filter((post) => !post.get("published_at"));

  res.render<AdminAnnouncementContext>("admin/announcements/admin-announcements", {
    ...res.locals,
    draftPosts,
    publishedPosts: allPostsCollection.filter((post) => !draftPosts.includes(post)),
    userLikes: await likeService.findUserLikeInfo(allPostsCollection.models, res.locals.user),
    currentPage,
    pageCount: allPostsCollection.pagination.pageCount
  });
}
