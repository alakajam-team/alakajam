import { BookshelfModel, PostBookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import enums from "server/core/enums";
import forms from "server/core/forms";
import highScoreService from "server/entry/highscore/entry-highscore.service";
import eventService from "server/event/event.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";

/**
 * Display a user profile
 */
export async function userProfile(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  const profileUser = await userService.findByName(req.params.name);
  if (profileUser) {
    res.locals.pageTitle = profileUser.get("title");
    res.locals.pageDescription = forms.markdownToText(profileUser.related("details").get("body"));

    const [entries, posts, scores] = await Promise.all([
      eventService.findUserEntries(profileUser as any),
      postService.findPosts({ userId: profileUser.get("id") }),
      highScoreService.findUserScores(profileUser.get("id"), { sortBy: "ranking" }),
    ]);

    const alakajamEntries = [];
    const otherEntries = [];
    const externalEntries = [];
    entries.models.forEach((entry) => {
      if (entry.get("external_event") != null) {
        externalEntries.push(entry);
      } else if (entry.related<BookshelfModel>("event").get("status_theme") !== enums.EVENT.STATUS_THEME.DISABLED) {
        alakajamEntries.push(entry);
      } else {
        otherEntries.push(entry);
      }
    });

    res.render("user/user-profile", {
      profileUser,
      alakajamEntries,
      otherEntries,
      externalEntries,
      posts,
      userScores: scores.models,
      medals: scores.countBy((userScore) => userScore.get("ranking")),
      userLikes: await likeService.findUserLikeInfo(posts.models as PostBookshelfModel[], res.locals.user)
    });
  } else {
    res.errorPage(404, "No user exists with name " + req.params.name);
  }
}
