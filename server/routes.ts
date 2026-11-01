import csurf from "csurf";
import express, { NextFunction, RequestHandler } from "express";
import config, * as configUtils from "server/core/config";
import { requireDigits, skipRouteUnless } from "server/core/route-guards";
import { initSlowDownMiddleware } from "server/core/slow-down-middleware";
import { initUploadMiddleware } from "server/core/upload-middleware";
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
import { eventManageEntries, eventManageEntriesPost } from "./event/manage/entries/event-manage-entries.controller";
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
import { adminMarketing as adminMarketing, adminMarketingDownloadSendgridCsv } from "./admin/marketing/admin-marketing.controller";

const upload = initUploadMiddleware();
const csrf = initCSRFMiddleware();
const csrfDisabled: RequestHandler = (req: CustomRequest, res: CustomResponse<CommonLocals>, next: NextFunction) => {

  req.csrfToken = () => "";
  next();
};
const csrfIfNotDebug = config.DEBUG_ADMIN ? [csrfDisabled] : [csrf];
const sensitiveActionsSlowDown: RequestHandler = initSensitiveActionsSlowDownMiddleware();

export function routes(app: express.Application): void {
  const router = express.Router();
  app.use(router);

  router.param("eventName", skipRouteUnless((value) => value.includes("-")));
  router.param("entryId", skipRouteUnless((value) => /^\d+$/.test(value)));

  // Run all middleware before any actual route handlers

  router.use(commonMiddleware);
  router.use("/admin", adminMiddleware);
  router.use("/:eventName/:entryId{/:entryName}{/*rest}", entryMiddleware);
  router.use("/:eventName", eventMiddleware);
  router.use("/post/:postId", postMiddleware);
  router.use("/dashboard", dashboardMiddleware);

  // General

  router.get("/", csrf, home);
  router.get("/user", usersRoot);
  router.get("/chat", chat);

  // Explorer

  router.get("/explore/events", events);
  router.get("/explore/games", games);
  router.get("/explore/people", people);
  router.get("/explore/people/mods", peopleMods);

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

  router.get("/dashboard{/feed}", csrf, dashboardFeed);
  router.get("/dashboard/entries", csrf, dashboardEntries);
  router.get("/dashboard/posts", csrf, dashboardPosts);
  router.get("/dashboard/scores", csrf, dashboardScores);
  router.get("/dashboard/settings", csrf, dashboardSettingsGet);
  router.post("/dashboard/settings", upload.single("avatar"), csrf, dashboardSettingsPost);
  router.get("/dashboard/password", csrf, dashboardPasswordGet);
  router.post("/dashboard/password", csrf, dashboardPasswordPost);
  router.get("/dashboard/entry-import", csrf, dashboardEntryImport);
  router.post("/dashboard/entry-import", csrf, dashboardEntryImport);

  // User profiles

  configUtils.getUserRedirects().forEach(({ from, to }) => {
    router.get(`/user/${from}`, (_req, res) => res.redirect(301, `/user/${to}`));
  });
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
  router.get("/admin/marketing", csrf, adminMarketing);
  router.post("/admin/marketing", csrf, adminMarketing);
  router.get("/admin/marketing/csv", csrf, adminMarketingDownloadSendgridCsv);
  router.get("/admin/users", csrf, adminUsers);
  router.get("/admin/dev", ...csrfIfNotDebug, adminDev);
  router.post("/admin/dev", ...csrfIfNotDebug, adminDev);
  router.get("/admin/status", csrf, adminStatus);

  // Entries & Events

  const entryFormParser = upload.single("picture");
  router.get("/events/ajax-find-external-event", apiSearchForExternalEvents);
  router.get("/tags/ajax-find-tags", apiSearchForTags);
  router.get("/:eventName/create-entry", csrf, entryManage);
  router.post("/:eventName/create-entry", entryFormParser, csrf, entryManage);
  router.get("/:eventName/ajax-find-team-mate", apiSearchForTeammate);
  router.get("/:eventName/:entryId{/:entryName}", csrf, entryView);
  router.post("/:eventName/:entryId{/:entryName}", csrf, entrySaveCommentOrVote);
  router.get("/:eventName/:entryId/:entryName/edit", csrf, entryManage);
  router.post("/:eventName/:entryId/:entryName/edit", entryFormParser, csrf, entryManage);
  router.get("/:eventName/:entryId/:entryName/delete", csrf, entryDelete);
  router.get("/:eventName/:entryId/:entryName/leave", csrf, entryLeave);
  router.get("/:eventName/:entryId/:entryName/accept-invite", csrf, inviteAccept);
  router.get("/:eventName/:entryId/:entryName/decline-invite", csrf, inviteDecline);
  router.get("/:eventName/:entryId/:entryName/submit-score", csrf, entryHighscoreSubmit);
  router.post("/:eventName/:entryId/:entryName/submit-score", upload.single("upload"), csrf, entryHighscoreSubmit);
  router.get("/:eventName/:entryId/:entryName/scores", entryHighscores);
  router.get("/:eventName/:entryId/:entryName/edit-scores", csrf, entryHighscoresManage);
  router.post("/:eventName/:entryId/:entryName/edit-scores", csrf, entryHighscoresManage);

  const eventFormParser = upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "background", maxCount: 1 }
  ]);
  router.get("/pick_event_template", csrf, eventCreate);
  router.get("/create_event", csrf, eventManage);
  router.post("/create_event", eventFormParser, csrf, eventManage);
  router.get("/:eventName", viewEventHome);
  router.get("/:eventName/dashboard", csrf, viewEventDashboard);
  router.post("/:eventName/dashboard", csrf, postEventDashboard);
  router.get("/:eventName/dashboard-streamer-preferences", csrf, viewStreamerPreferences);
  router.post("/:eventName/dashboard-streamer-preferences", csrf, saveStreamerPreferences);
  router.get("/:eventName/my-entry", viewEventDashboard); // deprecated
  router.get("/:eventName/join", joinLeaveEvent);
  router.get("/:eventName/announcements", viewEventHome); // deprecated
  router.get("/:eventName/posts", viewEventPosts);
  router.get("/:eventName/themes", csrf, eventThemes);
  router.post("/:eventName/themes", csrf, eventThemes);
  router.get("/:eventName/ajax-find-themes", ajaxFindThemes);
  router.post("/:eventName/ajax-save-vote", ajaxSaveThemeVote);
  router.get("/:eventName/games", csrf, viewEventGames);
  router.get("/:eventName/ratings", csrf, viewEventRatings);
  router.get("/:eventName/results", viewEventResults);
  router.get("/:eventName/tournament-games", csrf, viewEventTournamentGames);
  router.get("/:eventName/tournament-leaderboard", viewEventTournamentLeaderboard);
  router.get("/:eventName/streamers", csrf, eventStreamers);
  router.post("/:eventName/streamers", csrf, moderateEventStreamers);
  router.get("/:eventName/streamers-doc", eventStreamersDoc);
  router.get("/:eventName/edit", csrf, eventManage);
  router.post("/:eventName/edit", eventFormParser, csrf, eventManage);
  router.get("/:eventName/edit-themes", csrf, eventManageThemes);
  router.post("/:eventName/edit-themes", csrf, eventManageThemes);
  router.get("/:eventName/edit-entries", csrf, eventManageEntries);
  router.post("/:eventName/edit-entries", csrf, eventManageEntriesPost);
  router.get("/:eventName/edit-rankings", csrf, viewEventManageRankings);
  router.post("/:eventName/edit-rankings", csrf, postEventManageRankings);
  router.get("/:eventName/edit-tournament-games", csrf, eventManageTournament);
  router.post("/:eventName/edit-tournament-games", csrf, eventManageTournament);
  router.get("/:eventName/delete", csrf, eventDelete);

  // Posts

  router.get("/post{s}", postsView);

  router.get("/post/create", csrf, postEdit);
  router.post("/post/create", csrf, postSave);
  router.get("/post/:postId", csrf, postView);
  router.get("/post/:postId{/:postName}", requireDigits("postId"), csrf, postView);
  router.post("/post/:postId{/:postName}", requireDigits("postId"), csrf, commentSave);
  router.post("/post/:postId/:postName/edit", requireDigits("postId"), csrf, postSave);
  router.get("/post/:postId/:postName/edit", requireDigits("postId"), csrf, postEdit);
  router.get("/post/:postId/:postName/delete", requireDigits("postId"), csrf, postDelete);
  router.post("/post/:postId/:postName/watch", requireDigits("postId"), csrf, postWatch);
  router.post("/post/:postId/:postName/like", requireDigits("postId"), likePost);

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
    return initSlowDownMiddleware({
      windowMs: 10 * 60 * 1000, // 10 minutes
      delayAfter: 10,
      delayMs: 500,
      logMessage: "Slowing down sensitive actions for IP ",
    });
  }
}
