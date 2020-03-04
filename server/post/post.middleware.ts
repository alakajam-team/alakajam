
import { PostBookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import forms from "server/core/forms";
import postService from "./post.service";

export interface PostLocals extends CommonLocals {

  /**
   * The current blog post.
   */
  post: PostBookshelfModel;

}

export async function postMiddleware(req, res, next) {
  if (req.params.postId && req.params.postId !== "create") {
    if (forms.isId(req.params.postId)) {
      res.locals.post = await postService.findPostById(req.params.postId);
      if (res.locals.post && res.locals.post.get("event_id")) {
        res.locals.event = res.locals.post.related("event");
        if (res.locals.event) {
          res.locals.latestEventAnnouncement = await postService.findLatestAnnouncement({
            eventId: res.locals.event.get("id"),
          });
        }
      }
    }

    if (res.locals.post) {
      res.locals.pageTitle = res.locals.post.get("title");
      res.locals.pageDescription = forms.markdownToText(res.locals.post.get("body"));
    } else {
      res.errorPage(404, "Post not found");
      return;
    }
  }

  next();
}
