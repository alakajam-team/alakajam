// tslint:disable: max-line-length

/**
 * Controllers listing
 *
 * @module controllers
 */

import * as csurf from "csurf";
import * as multer from "multer";
import * as randomKey from "random-key";
import * as configUtils from "server/core/config";
import { adminHome } from "./admin/admin-home.controller";
import { adminMiddleware } from "./admin/admin.middleware";
import { adminDev } from "./admin/dev/admin-dev.controller";
import { adminEventPresets } from "./admin/event-presets/admin-event-presets.controller";
import { adminEventTemplates } from "./admin/event-templates/admin-event-templates.controller";
import { adminEvents } from "./admin/events/admin-events.controller";
import { adminPlatforms } from "./admin/platforms/admin-platforms.controller";
import { adminSettings } from "./admin/settings/admin-settings.controller";
import { adminStatus } from "./admin/status/admin-status.controller";
import { adminTags } from "./admin/tags/admin-tags.controller";
import { adminUsers } from "./admin/users/admin-users.controller";
import apiController from "./api/api.controller";
import { articleApiRoot, articleView } from "./docs/article.controller";
import { changes } from "./docs/changes/changes.controller";
import entryController from "./entry/entry.controller";
import eventController from "./event/event.controller";
import { eventDelete, eventManage, eventManageEntries, eventManageTemplate, eventManageThemes, eventManageTournament } from "./event/manage/event-manage.controller";
import { chat } from "./explore/chat.controller";
import { events } from "./explore/events.controller";
import { games } from "./explore/games.controller";
import { peopleMods } from "./explore/people-mods.controller";
import { people } from "./explore/people.controller";
import { globalMiddleware } from "./global.middleware";
import { home } from "./home/home.controller";
import postController from "./post/post.controller";
import userController from "./user/user.controller";

const upload = initUploadMiddleware();
const csrf = initCSRFMiddleware();

export default {

  initRoutes(app) {
    // Using express-promise-router instead of the default express.Router
    // allows our routes to return rejected promises to trigger the error
    // handling.
    const router = require("express-promise-router")();
    app.use(router);

    // Run all middleware before any actual route handlers

    router.use("*", globalMiddleware);
    router.use("/admin*", adminMiddleware);
    // Why `{0,}` instead of `*`? See: https://github.com/expressjs/express/issues/2495
    router.use("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName?/:rest*?", entryController.entryMiddleware);
    router.use("/:eventName([^/]{0,}-[^/]{0,})", eventController.eventMiddleware);
    router.use("/post/:postId", postController.postMiddleware);
    router.use("/post/:postId/*", postController.postMiddleware);
    router.use("/dashboard*", userController.dashboardMiddleware);

    // General

    router.get("/", home);
    router.get("/events", events);
    router.get("/games", games);
    router.get("/people", people);
    router.get("/people/mods", peopleMods);
    router.get("/user", people);
    router.get("/chat", chat);
    router.get("/changes", changes);

    // Users

    router.get("/register", csrf, userController.registerForm);
    router.post("/register", csrf, userController.doRegister);
    router.get("/login", csrf, userController.loginForm);
    router.post("/login", csrf, userController.doLogin);
    router.get("/logout", csrf, userController.doLogout);
    router.all("/passwordRecoveryRequest", csrf, userController.passwordRecoveryRequest);
    router.all("/passwordRecovery", csrf, userController.passwordRecovery);

    router.all("/dashboard(/feed)?", csrf, userController.dashboardFeed);
    router.all("/dashboard/entries", csrf, userController.dashboardEntries);
    router.all("/dashboard/posts", csrf, userController.dashboardPosts);
    router.all("/dashboard/scores", csrf, userController.dashboardScores);
    router.get("/dashboard/settings", csrf, userController.dashboardSettings);
    router.post("/dashboard/settings", upload.single("avatar"), csrf, userController.dashboardSettings);
    router.all("/dashboard/password", csrf, userController.dashboardPassword);
    router.all("/dashboard/entry-import", csrf, userController.dashboardEntryImport);
    router.get("/user/:name", csrf, userController.viewUserProfile);

    // Mod dashboard

    router.get("/admin", csrf, adminHome);
    router.get("/admin/events", csrf, adminEvents);
    router.all("/admin/event-presets", csrf, adminEventPresets);
    router.all("/admin/event-templates", csrf, adminEventTemplates);
    router.all("/admin/platforms", csrf, adminPlatforms);
    router.all("/admin/tags", csrf, adminTags);
    router.all("/admin/settings", csrf, adminSettings);
    router.get("/admin/users", csrf, adminUsers);
    router.all("/admin/dev", csrf, adminDev);
    router.all("/admin/status", csrf, adminStatus);

    // Entries & Events

    const entryFormParser = upload.single("picture");
    router.get("/events/ajax-find-external-event", entryController.searchForExternalEvents);
    router.get("/tags/ajax-find-tags", entryController.searchForTags);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/create-entry", csrf, entryController.editEntry);
    router.post("/:eventName([^/]{0,}-[^/]{0,})/create-entry", entryFormParser, csrf, entryController.editEntry);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/ajax-find-team-mate", entryController.searchForTeamMate);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName?", csrf, entryController.viewEntry);
    router.post("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName?", csrf, entryController.saveCommentOrVote);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/edit", csrf, entryController.editEntry);
    router.post("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/edit", entryFormParser, csrf, entryController.editEntry);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/delete", csrf, entryController.deleteEntry);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/leave", csrf, entryController.leaveEntry);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/accept-invite", csrf, entryController.acceptInvite);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/decline-invite", csrf, entryController.declineInvite);
    router.all("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/submit-score", upload.single("upload"), csrf, entryController.submitScore);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/scores", entryController.viewScores);
    router.all("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/edit-scores", csrf, entryController.editScores);

    const eventFormParser = upload.fields([{ name: "logo", maxCount: 1 }, { name: "banner", maxCount: 1 }]);
    router.get("/pick_event_template", csrf, eventManageTemplate);
    router.get("/create_event", csrf, eventManage);
    router.post("/create_event", eventFormParser, csrf, eventManage);
    router.get("/:eventName([^/]{0,}-[^/]{0,})", eventController.viewDefaultPage);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/announcements", eventController.viewEventAnnouncements);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/posts", eventController.viewEventPosts);
    router.all("/:eventName([^/]{0,}-[^/]{0,})/themes", csrf, eventController.viewEventThemes);
    router.all("/:eventName([^/]{0,}-[^/]{0,})/ajax-find-themes", eventController.ajaxFindThemes);
    router.all("/:eventName([^/]{0,}-[^/]{0,})/ajax-save-vote", eventController.ajaxSaveVote);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/games", csrf, eventController.viewEventGames);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/ratings", csrf, eventController.viewEventRatings);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/results", eventController.viewEventResults);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/tournament-games", csrf, eventController.viewEventTournamentGames);
    router.post("/:eventName([^/]{0,}-[^/]{0,})/tournament-games", csrf, eventController.submitTournamentGame);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/tournament-leaderboard", eventController.viewEventTournamentLeaderboard);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/edit", csrf, eventManage);
    router.post("/:eventName([^/]{0,}-[^/]{0,})/edit", eventFormParser, csrf, eventManage);
    router.all("/:eventName([^/]{0,}-[^/]{0,})/edit-themes", csrf, eventManageThemes);
    router.all("/:eventName([^/]{0,}-[^/]{0,})/edit-entries", csrf, eventManageEntries);
    router.all("/:eventName([^/]{0,}-[^/]{0,})/edit-tournament-games", csrf, eventManageTournament);
    router.get("/:eventName([^/]{0,}-[^/]{0,})/delete", csrf, eventDelete);

    // Posts

    router.get("/posts?", postController.viewPosts);

    router.get("/post/create", csrf, postController.editPost);
    router.post("/post/create", csrf, postController.savePost);
    router.get("/post/:postId", csrf, postController.viewPost);
    router.get("/post/:postId(\\d+)/:postName?", csrf, postController.viewPost);
    router.post("/post/:postId(\\d+)/:postName?", csrf, postController.saveComment);
    router.post("/post/:postId(\\d+)/:postName/edit", csrf, postController.savePost);
    router.get("/post/:postId(\\d+)/:postName/edit", csrf, postController.editPost);
    router.get("/post/:postId(\\d+)/:postName/delete", csrf, postController.deletePost);
    router.post("/post/:postId(\\d+)/:postName/watch", csrf, postController.watchPost);
    router.post("/post/:postId(\\d+)/:postName/like", postController.likePost);

    // Articles

    router.get("/article/:name", articleView);

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
  },

};

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
      fileSize: 2 * 1024 * 1024,
      files: 20,
      parts: 2000,
    },
  });
}

function initCSRFMiddleware() {
  // CSRF protection
  return csurf({
    cookie: false,
    ignoreMethods: ["GET"],
  });
}
