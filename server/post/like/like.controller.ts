import cache from "server/core/cache";
import constants from "server/core/constants";
import db from "server/core/db";
import forms from "server/core/forms";
import * as models from "server/core/models";
import security from "server/core/security";
import templating from "server/core/templating-functions";
import eventService from "../../event/event.service";
import eventRatingService from "../../event/rating/event-rating.service";
import likeService from "../like/like.service";
import postService from "../post.service";

/**
 * Likes or unlikes a post
 */
export async function likePost(req, res) {
  const { user, post } = res.locals;

  if (user) {
    if (req.body.like && likeService.isValidLikeType(req.body.like)) {
      await likeService.like(post, user.get("id"), req.body.like);
    } else if (req.body.unlike) {
      await likeService.unlike(post, user.get("id"));
    }
  }

  if (req.body.ajax) {
    res.render("post/like/ajax-likes", {
      post: await postService.findPostById(post.get("id")),
      userLikes: await likeService.findUserLikeInfo([post], user),
    });
  } else {
    res.redirect(req.query.redirect || templating.buildUrl(post, "post"));
  }
}
