import { BookshelfModel, PostBookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import enums from "server/core/enums";
import forms from "server/core/forms";
import entryService from "server/entry/entry.service";
import highScoreService from "server/entry/highscore/highscore.service";
import twitchService from "server/event/streamers/twitch.service";
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
    res.locals.pageTitle = profileUser.title;
    res.locals.pageDescription = forms.markdownToText(profileUser.details.body);

    const [entries, posts, scores, isTwitchLive] = await Promise.all([
      entryService.findUserEntries(profileUser),
      postService.findPosts({ userId: profileUser.id }),
      highScoreService.findUserScores(profileUser.id, { sortBy: "ranking" }),
      twitchService.isLive(profileUser)
    ]);

    const alakajamEntries = [];
    const otherEntries = [];
    const externalEntries = [];
    entries.models.forEach((entry) => {
      if (entry.get("event_id") != null) {
        if (entry.related<BookshelfModel>("event").get("status_theme") !== enums.EVENT.STATUS_THEME.DISABLED) {
          alakajamEntries.push(entry);
        } else {
          otherEntries.push(entry);
        }
      } else {
        externalEntries.push(entry);
      }
    });

    res.render<CommonLocals>("user/user-profile", {
      ...res.locals,
      profileUser,
      alakajamEntries,
      otherEntries,
      externalEntries,
      posts,
      userScores: scores.models,
      medals: scores.countBy((userScore: BookshelfModel) => userScore.get("ranking")),
      userLikes: await likeService.findUserLikeInfo(posts.models as PostBookshelfModel[], res.locals.user),
      isTwitchLive
    });
  } else {
    res.errorPage(404, "No user exists with name " + req.params.name);
  }
}
