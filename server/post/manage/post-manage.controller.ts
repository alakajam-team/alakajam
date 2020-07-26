
import { BookshelfCollection, BookshelfModel, PostBookshelfModel } from "bookshelf";
import cache from "server/core/cache";
import constants from "server/core/constants";
import { createLuxonDate, ZONE_UTC } from "server/core/formats";
import forms from "server/core/forms";
import links from "server/core/links";
import * as models from "server/core/models";
import security from "server/core/security";
import eventService from "server/event/event.service";
import { CustomRequest, CustomResponse } from "server/types";
import { buildPostContext } from "../post-view.controller";
import { PostLocals } from "../post.middleware";
import postService from "../post.service";

export async function postEdit(req: CustomRequest, res: CustomResponse<PostLocals>) {
  if (!res.locals.user) {
    res.redirect("/login?redirect=" + req.url);
    return;
  }

  const createMode = !res.locals.post;
  if (createMode || security.canUserWrite(res.locals.user, res.locals.post, { allowMods: true })) {
    if (createMode) {
      const post = new models.Post() as PostBookshelfModel;
      post.set("special_post_type", forms.sanitizeString(req.query.special_post_type?.toString()) || null);
      post.set("title", forms.sanitizeString(req.query.title?.toString()));
      if (forms.isId(req.query.eventId)) {
        post.set("event_id", req.query.eventId);
      } else if (res.locals.featuredEvent) {
        post.set("event_id", res.locals.featuredEvent.get("id"));
      }
      if (forms.isId(req.query.entryId)) {
        post.set("entry_id", req.query.entryId);
      }

      res.locals.post = post;
    }

    // Fetch related event info
    res.render<PostLocals>("post/manage/post-manage", await buildPostContext(res.locals));
  } else {
    res.errorPage(403);
  }
}

export async function postSave(req: CustomRequest, res: CustomResponse<PostLocals>) {
  let post = res.locals.post;

  // Check permissions
  if ((post && security.canUserWrite(res.locals.user,
    post, { allowMods: true })) || (!post && res.locals.user)) {
    let redirectToView = false;
    const title = forms.sanitizeString(req.body.title);
    const body = forms.sanitizeMarkdown(req.body.body, { maxLength: constants.MAX_BODY_POST });
    let errorMessage = null;
    let customPublishDate: Date | false = false;

    if (req.body["save-custom"]) {
      customPublishDate = forms.parsePickerDateTime(
        req.body["published-at"], { zone: res.locals.user.get("timezone") });
      if (!customPublishDate) {
        errorMessage = "Invalid scheduling time";
      }
    }
    if (!title) {
      errorMessage = "Title is mandatory";
    }
    if (!body) {
      errorMessage = "Empty posts are not allowed";
    }

    if (!errorMessage) {
      const eventIdIsValid = forms.isId(req.body["event-id"]);

      // Create new post if needed
      if (!post) {
        post = await postService.createPost(
          res.locals.user,
          eventIdIsValid ? req.body["event-id"] : undefined,
        );
      }

      // Fill post from form info
      post.set("title", title);
      post.set("body", body);
      const specialPostType = req.query.special_post_type || req.body["special-post-type"] || null;
      if (security.isMod(res.locals.user)) {
        validateSpecialPostType(specialPostType, res.locals.user);
        post.set("special_post_type", specialPostType);
      }
      if (eventIdIsValid) {
        post.set("event_id", req.body["event-id"]);
        if (post.hasChanged("event_id") || post.hasChanged("special_post_type")) {
          if (!post.get("special_post_type")) {
            await post.load(["userRoles", "author"]);

            // Update event ID on all roles
            for (const userRole of post.related<BookshelfCollection>("userRoles").models) {
              userRole.set("event_id", post.get("event_id"));
              await userRole.save();
            }

            // Figure out related entry from event + user
            const relatedEntry = await eventService.findUserEntryForEvent(
              post.related<BookshelfModel>("author") as any, post.get("event_id"));
            post.set("entry_id", relatedEntry ? relatedEntry.get("id") : null);
          } else {
            // Clear entry on special posts
            post.set("entry_id", null);
          }
        }
      } else {
        post.set("event_id", null);
        post.set("entry_id", null);
      }

      // Publication & redirection strategy
      redirectToView = true;
      if (req.body.publish) {
        post.set("published_at", new Date());
      } else if (req.body.unpublish) {
        post.set("published_at", null);
        redirectToView = false;
      } else if (customPublishDate) {
        const localPublishDate = createLuxonDate(customPublishDate, { zone: res.locals.user.get("timezone") });
        post.set("published_at", localPublishDate.setZone(ZONE_UTC).toJSDate());
      }

      // Save
      await post.save();
      cache.user(res.locals.user.get("name")).del("latestPostsCollection");
    } else if (!post) {
      post = new models.Post() as PostBookshelfModel;
    }

    // Render
    if (redirectToView) {
      res.redirect(links.routeUrl(post, "post")); // TODO move route to routing-service
    } else {
      res.locals.post = post;
      const context: any = await buildPostContext(res.locals);
      context.errorMessage = errorMessage;
      res.render<PostLocals>("post/manage/post-manage", {
        ...res.locals,
        ...context
      });
    }
  } else {
    res.errorPage(403);
  }
}

export async function postDelete(req: CustomRequest, res: CustomResponse<PostLocals>) {
  const { user, post } = res.locals;

  if (user && post && security.canUserManage(user, post, { allowMods: true })) {
    await postService.deletePost(post);
  }
  res.redirect("/");
}

function validateSpecialPostType(specialPostType, user) {
  if (specialPostType && constants.SPECIAL_POST_TYPES.indexOf(specialPostType) === -1) {
    throw new Error("invalid special post type: " + specialPostType);
  }
  if (specialPostType && !security.isMod(user)) {
    throw new Error("non-mod " + user.get("name") + " attempted to create a " + specialPostType + " post");
  }
}
