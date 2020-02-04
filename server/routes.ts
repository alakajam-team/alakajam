import * as csurf from "csurf";
import { RequestHandler } from "express";
import expressPromiseRouter from "express-promise-router";
import * as multer from "multer";
import * as randomKey from "random-key";
import config, * as configUtils from "server/core/config";
import constants from "server/core/constants";
import { adminMiddleware } from "./admin/admin.middleware";
import { adminAnnouncements } from "./admin/announcements/admin-announcements.controller";
import { adminDev } from "./admin/dev/admin-dev.controller";
import { adminEventPresets } from "./admin/event-presets/admin-event-presets.controller";
import { adminEventTemplates } from "./admin/event-templates/admin-event-templates.controller";
import { adminEvents } from "./admin/events/admin-events.controller";
import { adminPlatforms } from "./admin/platforms/admin-platforms.controller";
import { adminSettings } from "./admin/settings/admin-settings.controller";
import { adminStatus } from "./admin/status/admin-status.controller";
import { adminTags } from "./admin/tags/admin-tags.controller";
import { adminUsers } from "./admin/users/admin-users.controller";
import * as apiController from "./api/api.controller";
import { commonMiddleware } from "./common.middleware";
import { articleApiRoot, articleView } from "./docs/article.controller";
import { changes } from "./docs/changes/changes.controller";
import { inviteAccept, inviteDecline } from "./entry/entry-invite.controller";
import { apiSearchForExternalEvents, apiSearchForTags, apiSearchForTeammate, entrySaveCommentOrVote, entryView } from "./entry/entry-view.controller";
import { entryMiddleware } from "./entry/entry.middleware";
import { entryHighscoreSubmit } from "./entry/highscore/entry-highscore-submit.controller";
import { entryHighscores } from "./entry/highscore/entry-highscores.controller";
import { entryHighscoresManage } from "./entry/manage/entry-manage-scores.controller";
import { entryDelete, entryLeave, entryManage } from "./entry/manage/entry-manage.controller";
import { viewEventAnnouncements } from "./event/event-announcements.controller";
import { viewEventGames } from "./event/event-games.controller";
import { viewEventPosts } from "./event/event-posts.controller";
import { viewDefaultPage } from "./event/event-root.controller";
import { eventMiddleware } from "./event/event.middleware";
import { eventManageEntries } from "./event/manage/event-manage-entries.controller";
import { eventManageTemplate } from "./event/manage/event-manage-template.controller";
import { eventManageThemes } from "./event/manage/event-manage-themes.controller";
import { eventManageTournament } from "./event/manage/event-manage-tournament.controller";
import { eventDelete, eventManage } from "./event/manage/event-manage.controller";
import { viewEventRatings } from "./event/rating/event-ratings.controller";
import { viewEventResults } from "./event/rating/event-results.controller";
import { ajaxFindThemes, ajaxSaveThemeVote, eventThemes } from "./event/theme/event-themes.controller";
import { viewEventTournamentGames } from "./event/tournament/tournament-games.controller";
import { viewEventTournamentLeaderboard } from "./event/tournament/tournament-leaderboard.controller";
import { chat } from "./explore/chat.controller";
import { events } from "./explore/events.controller";
import { games } from "./explore/games.controller";
import { peopleMods } from "./explore/people-mods.controller";
import { people } from "./explore/people.controller";
import { home } from "./home/home.controller";
import { commentSave } from "./post/comment/comment.controller";
import { likePost } from "./post/like/like.controller";
import { postDelete, postEdit, postSave } from "./post/manage/post-manage.controller";
import { postView } from "./post/post-view.controller";
import { postWatch } from "./post/post-watch.controller";
import { postMiddleware } from "./post/post.middleware";
import { postsView } from "./post/posts-view.controller";
import { loginGet, loginPost } from "./user/authentication/login.controller";
import { logout } from "./user/authentication/logout.controller";
import { passwordRecoveryRequest } from "./user/authentication/password-recovery-request.controller";
import { passwordRecovery } from "./user/authentication/password-recovery.controller";
import registerController from "./user/authentication/register.controller";
import { dashboardEntries } from "./user/dashboard/dashboard-entries.controller";
import { dashboardEntryImport } from "./user/dashboard/dashboard-entry-import.controller";
import { dashboardFeed } from "./user/dashboard/dashboard-feed.controller";
import { dashboardPasswordGet, dashboardPasswordPost } from "./user/dashboard/dashboard-password.controller";
import { dashboardPosts } from "./user/dashboard/dashboard-posts.controller";
import { dashboardScores } from "./user/dashboard/dashboard-scores.controller";
import { dashboardSettingsGet, dashboardSettingsPost } from "./user/dashboard/dashboard-settings.controller";
import { dashboardMiddleware } from "./user/dashboard/dashboard.middleware";
import { userProfile } from "./user/user-profile.controller";

const upload = initUploadMiddleware();
const csrf = initCSRFMiddleware();
const csrfDisabled: RequestHandler = (req, res, next) => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  req.csrfToken = () => "";
  next();
};
const csrfIfNotDebug = config.DEBUG_ADMIN ? [csrfDisabled] : [csrf];

export function routes(app) {
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
  router.get("/games", games);
  router.get("/people", people);
  router.get("/people/mods", peopleMods);
  router.get("/user", people);
  router.get("/chat", chat);
  router.get("/changes", changes);

  // Users

  router.get("/register", csrf, registerController.registerForm.bind(registerController));
  router.post("/register", csrf, registerController.register.bind(registerController));
  router.get("/login", csrf, loginGet);
  router.post("/login", csrf, loginPost);
  router.get("/logout", csrf, logout);
  router.all("/passwordRecoveryRequest", csrf, passwordRecoveryRequest);
  router.all("/passwordRecovery", csrf, passwordRecovery);

  router.all("/dashboard(/feed)?", csrf, dashboardFeed);
  router.all("/dashboard/entries", csrf, dashboardEntries);
  router.all("/dashboard/posts", csrf, dashboardPosts);
  router.all("/dashboard/scores", csrf, dashboardScores);
  router.get("/dashboard/settings", csrf, dashboardSettingsGet);
  router.post("/dashboard/settings", upload.single("avatar"), csrf, dashboardSettingsPost);
  router.get("/dashboard/password", csrf, dashboardPasswordGet);
  router.post("/dashboard/password", csrf, dashboardPasswordPost);
  router.all("/dashboard/entry-import", csrf, dashboardEntryImport);
  router.get("/user/:name", csrf, userProfile);

  // Mod dashboard

  router.get("/admin", csrf, adminAnnouncements);
  router.get("/admin/events", csrf, adminEvents);
  router.all("/admin/event-presets", csrf, adminEventPresets);
  router.all("/admin/event-templates", csrf, adminEventTemplates);
  router.all("/admin/platforms", csrf, adminPlatforms);
  router.all("/admin/tags", csrf, adminTags);
  router.all("/admin/settings", csrf, adminSettings);
  router.get("/admin/users", csrf, adminUsers);
  router.all("/admin/dev", ...csrfIfNotDebug, adminDev);
  router.all("/admin/status", csrf, adminStatus);

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
  router.all("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/submit-score", upload.single("upload"), csrf, entryHighscoreSubmit);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/scores", entryHighscores);
  router.all("/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/edit-scores", csrf, entryHighscoresManage);

  const eventFormParser = upload.fields([{ name: "logo", maxCount: 1 }, { name: "banner", maxCount: 1 }]);
  router.get("/pick_event_template", csrf, eventManageTemplate);
  router.get("/create_event", csrf, eventManage);
  router.post("/create_event", eventFormParser, csrf, eventManage);
  router.get("/:eventName([^/]{0,}-[^/]{0,})", viewDefaultPage);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/announcements", viewEventAnnouncements);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/posts", viewEventPosts);
  router.all("/:eventName([^/]{0,}-[^/]{0,})/themes", csrf, eventThemes);
  router.all("/:eventName([^/]{0,}-[^/]{0,})/ajax-find-themes", ajaxFindThemes);
  router.all("/:eventName([^/]{0,}-[^/]{0,})/ajax-save-vote", ajaxSaveThemeVote);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/games", csrf, viewEventGames);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/ratings", csrf, viewEventRatings);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/results", viewEventResults);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/tournament-games", csrf, viewEventTournamentGames);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/tournament-leaderboard", viewEventTournamentLeaderboard);
  router.get("/:eventName([^/]{0,}-[^/]{0,})/edit", csrf, eventManage);
  router.post("/:eventName([^/]{0,}-[^/]{0,})/edit", eventFormParser, csrf, eventManage);
  router.all("/:eventName([^/]{0,}-[^/]{0,})/edit-themes", csrf, eventManageThemes);
  router.all("/:eventName([^/]{0,}-[^/]{0,})/edit-entries", csrf, eventManageEntries);
  router.all("/:eventName([^/]{0,}-[^/]{0,})/edit-tournament-games", csrf, eventManageTournament);
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
    ignoreMethods: ["GET"],
  });
}
