import cache from "server/core/cache";
import constants from "server/core/constants";
import enums from "server/core/enums";
import fileStorage from "server/core/file-storage";
import forms from "server/core/forms";
import security from "server/core/security";
import highScoreService from "server/entry/highscore/entry-highscore.service";
import entryImportService from "server/entry/import/entry-import.service";
import eventService from "server/event/event.service";
import commentService from "server/post/comment/comment.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import userService from "server/user/user.service";

/**
 * Display a user profile
 */
export async function userProfile(req, res) {
  const profileUser = await userService.findByName(req.params.name);
  if (profileUser) {
    res.locals.pageTitle = profileUser.get("title");
    res.locals.pageDescription = forms.markdownToText(profileUser.related("details").get("body"));

    const [entries, posts, scores] = await Promise.all([
      eventService.findUserEntries(profileUser),
      postService.findPosts({ userId: profileUser.get("id") }),
      highScoreService.findUserScores(profileUser.get("id"), { sortBy: "ranking" }),
      profileUser.load("details"),
    ]);

    const alakajamEntries = [];
    const otherEntries = [];
    const externalEntries = [];
    entries.models.forEach((entry) => {
      if (entry.get("external_event") != null) {
        externalEntries.push(entry);
      } else if (entry.related("event").get("status_theme") !== enums.EVENT.STATUS_THEME.DISABLED) {
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
      userLikes: await likeService.findUserLikeInfo(posts, res.locals.user),
    });
  } else {
    res.errorPage(404, "No user exists with name " + req.params.name);
  }
}
