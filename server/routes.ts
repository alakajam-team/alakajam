import csurf from "csurf";
import express, { NextFunction, RequestHandler } from "express";
import expressPromiseRouter from "express-promise-router";
import expressSlowDown from "express-slow-down";
import multer from "multer";
import * as randomKey from "random-key";
import config, * as configUtils from "server/core/config";
import constants from "server/core/constants";
import log from "server/core/log";
import { adminMiddleware } from "./admin/admin.middleware";
import { adminAnnouncements } from "./admin/announcements/admin-announcements.controller";
import { adminDev } from "./admin/dev/admin-dev.controller";
import { adminEventPresets } from "./admin/event-presets/admin-event-presets.controller";
import { adminEventTemplates } from "./admin/event-templates/admin-event-templates.controller";
import { adminEvents, adminEventsPost } from "./admin/events/admin-events.controller";
import { adminPlatforms } from "./admin/platforms/admin-platforms.controller";
import { adminSettings } from "./admin/settings/admin-settings.controller";
import { adminStatus } from "./admin/status/admin-status.controller";
import { adminTags } from "./admin/tags/admin-tags.controller";
import { adminUsers } from "./admin/users/admin-users.controller";
import * as apiController from "./api/api.controller";
import { CommonLocals, commonMiddleware } from "./common.middleware";
import { articleApiRoot, articleView } from "./docs/article.controller";
import { changes } from "./docs/changes/changes.controller";
import { entryMiddleware } from "./entry/entry.middleware";
import { entryHighscoreSubmit } from "./entry/highscore/highscore-submit.controller";
import { entryHighscores } from "./entry/highscore/highscores.controller";
import { entryHighscoresManage } from "./entry/manage/entry-manage-scores.controller";
import { entryDelete, entryLeave, entryManage } from "./entry/manage/entry-manage.controller";
import { inviteAccept, inviteDecline } from "./entry/team/team-invite.controller";
import {
  apiSearchForExternalEvents,
  apiSearchForTags,
  apiSearchForTeammate,
  entrySaveCommentOrVote,
  entryView
} from "./entry/view/entry-view.controller";
import { joinLeaveEvent } from "./event/dashboard/event-join.controller";
import { saveStreamerPreferences, viewStreamerPreferences } from "./event/dashboard/event-my-dashboard-streamer.controller";
import { postEventDashboard, viewEventDashboard } from "./event/dashboard/event-my-dashboard.controller";
import { eventMiddleware } from "./event/event.middleware";
import { viewEventGames } from "./event/games/event-games.controller";
import { viewEventHome } from "./event/home/event-home.controller";
import { eventCreate } from "./event/manage/create/event-create.controller";
import { eventManageEntries } from "./event/manage/entries/event-manage-entries.controller";
import { postEventManageRankings, viewEventManageRankings } from "./event/manage/rankings/event-manage-rankings.controller";
import { eventDelete, eventManage } from "./event/manage/settings/event-settings.controller";
import { eventManageThemes } from "./event/manage/themes/event-manage-themes.controller";
import { eventManageTournament } from "./event/manage/tournament/event-manage-tournament.controller";
import { viewEventPosts } from "./event/posts/event-posts.controller";
import { viewEventRatings } from "./event/ratings/ratings.controller";
import { viewEventResults } from "./event/results/results.controller";
import { eventStreamers, eventStreamersDoc, moderateEventStreamers } from "./event/streamers/streamers.controller";
import { ajaxFindThemes, ajaxSaveThemeVote, eventThemes } from "./event/theme/theme.controller";
import { viewEventTournamentGames } from "./event/tournament/tournament-games.controller";
import { viewEventTournamentLeaderboard } from "./event/tournament/tournament-leaderboard.controller";
import { chat } from "./explore/chat.controller";
import { events } from "./explore/events.controller";
import { games } from "./explore/games.controller";
import { peopleMods } from "./explore/people-mods.controller";
import { people, usersRoot } from "./explore/people.controller";
import { home } from "./home/home.controller";
import { commentSave } from "./post/comment/comment.controller";
import { likePost } from "./post/like/like.controller";
import { postDelete, postEdit, postSave } from "./post/manage/post-manage.controller";
import { postView } from "./post/post-view.controller";
import { postWatch } from "./post/post-watch.controller";
import { postMiddleware } from "./post/post.middleware";
import { postsView } from "./post/posts-view.controller";
import { CustomRequest, CustomResponse } from "./types";
import { loginGet, loginPost } from "./user/authentication/login.controller";
import { logout } from "./user/authentication/logout.controller";
import { passwordRecoveryRequest } from "./user/authentication/password-recovery/password-recovery-request.controller";
import { passwordRecovery } from "./user/authentication/password-recovery/password-recovery.controller";
import registerController from "./user/authentication/register.controller";
import { dashboardMiddleware } from "./user/dashboard/dashboard.middleware";
import { dashboardEntries } from "./user/dashboard/entries/dashboard-entries.controller";
import { dashboardEntryImport } from "./user/dashboard/entries/dashboard-entry-import.controller";
import { dashboardFeed } from "./user/dashboard/feed/dashboard-feed.controller";
import { dashboardPasswordGet, dashboardPasswordPost } from "./user/dashboard/password/dashboard-password.controller";
import { dashboardPosts } from "./user/dashboard/posts/dashboard-posts.controller";
import { dashboardScores } from "./user/dashboard/scores/dashboard-scores.controller";
import { dashboardSettingsGet, dashboardSettingsPost } from "./user/dashboard/settings/dashboard-settings.controller";
import { userProfile } from "./user/user-profile.controller";

const upload = initUploadMiddleware();
const csrf = initCSRFMiddleware();
const csrfDisabled: RequestHandler = (req: CustomRequest, res: CustomResponse<CommonLocals>, next: NextFunction) => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  req.csrfToken = () => "";
  next();
};
const csrfIfNotDebug = config.DEBUG_ADMIN ? [csrfDisabled] : [csrf];
const sensitiveActionsSlowDown: RequestHandler = initSensitiveActionsSlowDownMiddleware();

export function routes(app: express.Application): void {
  // Using express-promise-router instead of the default express.Router
  // allows our routes to return rejected promises to trigger the error
  // handling.
  const router = expressPromiseRouter();
  app.use(router);

  // Run all middleware before any actual route handlers

  router.use("*", commonMiddleware);
  router.use("/admin*", adminMiddleware);
  // Why `{0,}` instead of `*`? See: https://github.com/expressjs/express/issues/2495
  router.use("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName?/:rest*?", entryMiddleware);
  router.use("/:eventName([^/]{0,}-[^/]{0,})", eventMiddleware);
  router.use("/post/:postId", postMiddleware);
  router.use("/post/:postId/*", postMiddleware);
  router.use("/dashboard*", dashboardMiddleware);

  // General

  router.get("/", home);
  router.get("/events", events);
  router.get("/events/games", games);
  router.get("/events/people", people);
  router.get("/events/people/mods", peopleMods);
  router.get("/user", usersRoot);
  router.get("/chat", chat);
  router.get("/changes", changes);

  // Users

  router.get("/register", csrf, registerController.registerForm.bind(registerController));
  router.post("/register", sensitiveActionsSlowDown, csrf, registerController.register.bind(registerController));
  router.get("/login", csrf, loginGet);
  router.post("/login", sensitiveActionsSlowDown, csrf, loginPost);
  router.get("/logout", csrf, logout);
  router.get("/passwordRecoveryRequest", csrf, passwordRecoveryRequest);
  router.post("/passwordRecoveryRequest", sensitiveActionsSlowDown, csrf, passwordRecoveryRequest);
  router.get("/passwordRecovery", csrf, passwordRecovery);
  router.post("/passwordRecovery", sensitiveActionsSlowDown, csrf, passwordRecovery);

  router.get("/dashboard(/feed)?", csrf, dashboardFeed);
  router.get("/dashboard/entries", csrf, dashboardEntries);
  router.get("/dashboard/posts", csrf, dashboardPosts);
  router.get("/dashboard/scores", csrf, dashboardScores);
  router.get("/dashboard/settings", csrf, dashboardSettingsGet);
  router.post("/dashboard/settings", upload.single("avatar"), csrf, dashboardSettingsPost);
  router.get("/dashboard/password", csrf, dashboardPasswordGet);
  router.post("/dashboard/password", csrf, dashboardPasswordPost);
  router.get("/dashboard/entry-import", csrf, dashboardEntryImport);
  router.post("/dashboard/entry-import", csrf, dashboardEntryImport);
  router.get("/user/:name", csrf, userProfile);

  // Mod dashboard

  router.get("/admin", csrf, adminAnnouncements);
  router.get("/admin/events", csrf, adminEvents);
  router.post("/admin/events", csrf, adminEventsPost);
  router.get("/admin/event-presets", csrf, adminEventPresets);
  router.post("/admin/event-presets", csrf, adminEventPresets);
  router.get("/admin/event-templates", csrf, adminEventTemplates);
  router.post("/admin/event-templates", csrf, adminEventTemplates);
  router.get("/admin/platforms", csrf, adminPlatforms);
  router.post("/admin/platforms", csrf, adminPlatforms);
  router.get("/admin/tags", csrf, adminTags);
  router.post("/admin/tags", csrf, adminTags);
  router.get("/admin/settings", csrf, adminSettings);
  router.post("/admin/settings", csrf, adminSettings);
  router.get("/admin/users", csrf, adminUsers);
  router.get("/admin/dev", ...csrfIfNotDebug, adminDev);
  router.post("/admin/dev", ...csrfIfNotDebug, adminDev);
  router.get("/admin/status", csrf, adminStatus);

  // Entries & Events

  const entryFormParser = upload.single("picture");
  router.get("/events/ajax-find-external-event", apiSearchForExternalEvents);
  router.get("/tags/ajax-find-tags", apiSearchForTags);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/create-entry", csrf, entryManage);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/create-entry", entryFormParser, csrf, entryManage);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/ajax-find-team-mate", apiSearchForTeammate);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName?", csrf, entryView);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName?", csrf, entrySaveCommentOrVote);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/edit", csrf, entryManage);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/edit", entryFormParser, csrf, entryManage);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/delete", csrf, entryDelete);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/leave", csrf, entryLeave);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/accept-invite", csrf, inviteAccept);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/decline-invite", csrf, inviteDecline);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/submit-score", csrf, entryHighscoreSubmit);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/submit-score", upload.single("upload"), csrf, entryHighscoreSubmit);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/scores", entryHighscores);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/edit-scores", csrf, entryHighscoresManage);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/edit-scores", csrf, entryHighscoresManage);

  const eventFormParser = upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "background", maxCount: 1 }
  ]);
  router.get("/pick_event_template", csrf, eventCreate);
  router.get("/create_event", csrf, eventManage);
  router.post("/create_event", eventFormParser, csrf, eventManage);
  router.get("/:eventName([^/]{0,}-[^/]{0,})", viewEventHome);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/dashboard", csrf, viewEventDashboard);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/dashboard", csrf, postEventDashboard);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/dashboard-streamer-preferences", csrf, viewStreamerPreferences);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/dashboard-streamer-preferences", csrf, saveStreamerPreferences);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/my-entry", viewEventDashboard); // deprecated
  router.get("/:eventName([^/]{0,}-[^/]{0,})/join", joinLeaveEvent);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/announcements", viewEventHome); // deprecated
  router.get("/:eventName([^/]{0,}-[^/]{0,})/posts", viewEventPosts);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/themes", csrf, eventThemes);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/themes", csrf, eventThemes);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/ajax-find-themes", ajaxFindThemes);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/ajax-save-vote", ajaxSaveThemeVote);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/games", csrf, viewEventGames);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/ratings", csrf, viewEventRatings);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/results", viewEventResults);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/tournament-games", csrf, viewEventTournamentGames);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/tournament-leaderboard", viewEventTournamentLeaderboard);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/streamers", csrf, eventStreamers);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/streamers", csrf, moderateEventStreamers);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/streamers-doc", eventStreamersDoc);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/edit", csrf, eventManage);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/edit", eventFormParser, csrf, eventManage);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/edit-themes", csrf, eventManageThemes);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/edit-themes", csrf, eventManageThemes);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/edit-entries", csrf, eventManageEntries);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/edit-rankings", csrf, viewEventManageRankings);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/edit-rankings", csrf, postEventManageRankings);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/edit-tournament-games", csrf, eventManageTournament);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/edit-tournament-games", csrf, eventManageTournament);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/delete", csrf, eventDelete);

  // Posts

  router.get("/posts?", postsView);

  router.get("/post/create", csrf, postEdit);
  router.post("/post/create", csrf, postSave);
  router.get("/post/:postId", csrf, postView);
  router.get("/post/:postId(\\d+)/:postName?", csrf, postView);
  router.post("/post/:postId(\\d+)/:postName?", csrf, commentSave);
  router.post("/post/:postId(\\d+)/:postName/edit", csrf, postSave);
  router.get("/post/:postId(\\d+)/:postName/edit", csrf, postEdit);
  router.get("/post/:postId(\\d+)/:postName/delete", csrf, postDelete);
  router.post("/post/:postId(\\d+)/:postName/watch", csrf, postWatch);
  router.post("/post/:postId(\\d+)/:postName/like", likePost);

  // Articles

  router.get("/article/:category", articleView);
  router.get("/article/:category/:name", articleView);

  // JSON API

  router.get("/api", articleApiRoot);
  router.get("/api/featuredEvent", apiController.getFeaturedEvent);
  router.get("/api/event", apiController.getEventTimeline);
  router.get("/api/event/:event", apiController.getEvent);
  router.get("/api/event/:event/shortlist", apiController.getEventShortlist);
  router.get("/api/entry/:entry", apiController.getEntry);
  router.get("/api/user", apiController.getUserSearch);
  router.get("/api/user/:user", apiController.getUser);
  router.get("/api/user/:user/latestEntry", apiController.getUserLatestEntry);
  router.get("/api/theme/:theme", apiController.getThemeStats);
}

function initUploadMiddleware() {
  // Multipart form parser
  const uploadStorage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, configUtils.tmpPathAbsolute());
    },
    filename(req, file, cb) {
      file.filename = randomKey.generate() + "-" + file.originalname;
      cb(null, file.filename);
    },
  });
  return multer({
    storage: uploadStorage,
    limits: {
      fields: 1000,
      fileSize: constants.MAX_UPLOAD_SIZE,
      files: 20,
      parts: 2000,
    },
  });
}

function initCSRFMiddleware() {
  // CSRF protection
  return csurf({
    cookie: false,
    ignoreMethods: ["GET"]
  });
}


function initSensitiveActionsSlowDownMiddleware(): RequestHandler {
  if (config.DEBUG_DISABLE_SLOW_DOWN) {
    return (_req, _res, next) => { next(); };
  } else {
    return expressSlowDown({
      windowMs: 10 * 60 * 1000, // 10 minutes
      delayAfter: 10,
      delayMs: 500,
      onLimitReached: (req) => {
        log.info("Slowing down sensitive actions for IP " + req.ip);
      }
    });
  }
}
