import { BookshelfModel } from "bookshelf";
import { NextFunction, Response } from "express";
import { JSX } from "preact";
import forms from "server/core/forms";
import security from "server/core/security";
import settings from "server/core/settings";
import eventService from "server/event/event.service";
import notificationService from "server/user/notification/notification.service";
import userService from "server/user/user.service";
import { SETTING_FEATURED_EVENT_NAME } from "./core/settings-keys";
import { User } from "./entity/user.entity";
import commentService from "./post/comment/comment.service";
import { Alert, CustomRequest } from "./types";

export interface CommonLocals {
  [key: string]: any;

  /**
   * Current local path.
   * Available everywhere.
   */
  readonly path: string;

  /**
   * The title to set on the current page.
   * Available and settable everywhere.
   */
  pageTitle: string;

  /**
   * The description to set on the current page, for search engines and social media cards.
   * Available and settable everywhere.
   */
  pageDescription: string;

  /**
   * The main page picture, to be used in social media integration.
   */
  pageImage?: string;

  /**
   * Messages to notify to the user in the top of the screen when the page loads.
   * Available and settable everywhere.
   */
  alerts: Alert[];

  /**
   * Current logged in user (undefined if logged out).
   * Available everywhere.
   */
  readonly user?: User;

  /**
   * The number of unread notifications for the current logged in user (undefined if logged out).
   * Available everywhere.
   */
  readonly unreadNotifications?: number;

  /**
   * The model of the currently featured event.
   * Available everywhere.
   */
  readonly featuredEvent: BookshelfModel;

  /**
   * The model of the currently edited comment.
   * Available everywhere.
   */
  readonly editComment: BookshelfModel;

  /**
   * For JSX render functions only.
   * List of absolute URLs to append as JavaScript files.
   */
  readonly scripts: string[];

  /**
   * For JSX render functions only.
   * List of inline styles to append to the page.
   */
  readonly inlineStyles: string[];

  /**
   * Generates a JSX element to be inserted in all forms for CSRF protection.
   */
  readonly csrfToken: () => JSX.Element;

  /**
   * Generates a stringified element to be inserted in client-side generated forms for CSRF protection.
   */
  readonly csrfTokenHTML: () => string;
}

export async function commonMiddleware(req: CustomRequest, res: Response, next: NextFunction) {
  res.locals.path = req.originalUrl;

  // Init alerts, restore them from the session if needed
  res.locals.alerts = [];
  if (req.session.alerts && req.session.alerts.length > 0) {
    res.locals.alerts = req.session.alerts || [];
    req.session.alerts = [];
    await req.session.saveAsync();
  }

  // JSX template tooling
  res.locals.scripts = [];
  res.locals.inlineStyles = [];

  // Fetch current user
  let userTask = null;
  if (req.session.userId) {
    userTask = userService.findById(req.session.userId).then((user) => {
      res.locals.user = user;

      // Fetch comment to edit
      if (req.query.editComment && forms.isId(req.query.editComment)) {
        return commentService.findCommentById(forms.parseInt(req.query.editComment.toString())).then(async (comment) => {
          if (comment && (security.canUserWrite(user, comment, { allowMods: true }) ||
              await commentService.isOwnAnonymousComment(comment, user))) {
            res.locals.editComment = comment;
          }
        });
      }
    });
  }

  // Fetch featured events
  const featuredEventTask = settings.find(SETTING_FEATURED_EVENT_NAME)
    .then((featuredEventName) => {
      if (featuredEventName) {
        return eventService.findEventByName(featuredEventName);
      }
    }).then((featuredEvent) => {
      if (featuredEvent) {
        res.locals.featuredEvent = featuredEvent;
      }
    });

  await Promise.all([featuredEventTask, userTask]); // Parallelize fetching both

  // Update unread notifications, from cache if possible
  if (res.locals.user && res.locals.path !== "/dashboard/feed") {
    res.locals.unreadNotifications = await notificationService.countUnreadNotifications(res.locals.user);
  }

  next();
}
