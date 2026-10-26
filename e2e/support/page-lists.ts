import { E2E_ENTRIES, E2E_EVENTS, E2E_POSTS, E2E_USERS } from "../../server/testing/e2e/e2e-seed-data";

/*
 * Pages and API endpoints to check for errors, pointing at the seeded data (see server/testing/e2e/e2e-seed.ts)
 */

const submissionsOpen = E2E_EVENTS.submissionsOpen.name;
const myGame = entryUrl(E2E_ENTRIES.dumbledoreSubmissionsOpen);
const myExternalEntry = entryUrl(E2E_ENTRIES.adminExternalWithScores);

export const PAGES_ADMIN: Record<string, string> = {
  "admin-home": "/admin",
  "admin-events": "/admin/events",
  "admin-event-presets": "/admin/event-presets",
  "admin-event-templates": "/admin/event-templates",
  "admin-platforms": "/admin/platforms",
  "admin-tags": "/admin/tags",
  "admin-settings": "/admin/settings",
  "admin-users": "/admin/users",
  "admin-dev": "/admin/dev",
  "admin-status": "/admin/status",

  "create-event-choose-template": "/pick_event_template",
  "create-event": "/create_event",
  "edit-event": `/${submissionsOpen}/edit`,
  "edit-event-themes": `/${E2E_EVENTS.themeVoting.name}/edit-themes`,
  "edit-event-entries": `/${submissionsOpen}/edit-entries?entryDetails=${E2E_ENTRIES.dumbledoreSubmissionsOpen.id}`,

  "event-streamer-preferences": `/${submissionsOpen}/dashboard-streamer-preferences`,
  "moderate-entry": `${myGame}/edit`
};

export const PAGES_COMMON: Record<string, string> = {
  "home": "/",
  "events": "/explore/events",
  "games": "/explore/games",
  "people": "/explore/people",
  "people-mods": "/explore/people/mods",
  "chat": "/chat",
  "about-home": "/article/about",
  "docs-resources": "/article/docs/resources",

  "register": "/register",
  "login": "/login",
  "password-recovery-request": "/passwordRecoveryRequest",

  "user-profile": `/user/${E2E_USERS.administrator}`,

  "api-home": "/api",
  "api-events-example": "/api/event?pretty=true",

  "post": `/post/${E2E_POSTS.adminPlog.id}/${E2E_POSTS.adminPlog.name}`,

  "event": `/${submissionsOpen}`,
  "event-dashboard": `/${submissionsOpen}/dashboard`,
  "event-streamers": `/${submissionsOpen}/streamers`,
  "event-posts": `/${submissionsOpen}/posts`,
  "event-theme-voting": `/${E2E_EVENTS.themeVoting.name}/themes`,
  "event-theme-shortlist": `/${E2E_EVENTS.themeShortlist.name}/themes`,
  "event-entries": `/${submissionsOpen}/games`,
  "event-results": `/${E2E_EVENTS.resultsOut.name}/results?sortBy=1&division=solo`,
  "event-results-unranked": `/${E2E_EVENTS.resultsOut.name}/results?sortBy=1&division=unranked`,

  "entry-view": `${myGame}/`,
  "entry-view-external": `${myExternalEntry}/`,
  "entry-scores": `${myExternalEntry}/scores`,
  "entry-rate": `${entryUrl(E2E_ENTRIES.adminGameRatingsOptedOut)}/`,
  "entry-with-team": `${entryUrl(E2E_ENTRIES.gandalfGameRatingsTeam)}/`,

  "tournament-games": `/${E2E_EVENTS.liveTournament.name}/tournament-games`,
  "tournament-leaderboard": `/${E2E_EVENTS.liveTournament.name}/tournament-leaderboard`
};

export const PAGES_USER: Record<string, string> = {
  "dashboard-home": "/dashboard/feed",
  "dashboard-entries": "/dashboard/entries",
  "dashboard-posts": "/dashboard/posts",
  "dashboard-scores": "/dashboard/scores",
  "dashboard-settings": "/dashboard/settings",
  "dashboard-password": "/dashboard/password",
  "dashboard-entry-import": "/dashboard/entry-import",

  "post-create": "/post/create",
  "post-create-with-params": `/post/create?eventId=${E2E_EVENTS.submissionsOpen.id}&special_post_type=announcement`,

  "entry-create": `/${submissionsOpen}/create-entry`,
  "entry-edit": `${myGame}/edit`,
  "entry-submit-score": `${myExternalEntry}/submit-score`,
  "entry-manage-scores": `${myGame}/edit-scores`,

  "event-ratings": `/${E2E_EVENTS.gameRatings.name}/ratings`,

  "logout": "/logout"
};

export const API_ENDPOINTS: Record<string, string> = {
  "api-featured-events": "/api/featuredEvent",
  "api-events": "/api/event",
  "api-event": `/api/event/${submissionsOpen}`,
  "api-entry": `/api/entry/${E2E_ENTRIES.dumbledoreSubmissionsOpen.id}`,
  "api-users": "/api/user",
  "api-user": `/api/user/${E2E_USERS.dumbledore}`,
  "api-user-entry": `/api/user/${E2E_USERS.dumbledore}/latestEntry`
};

function entryUrl(entry: { eventName: string; id: number; name: string }) {
  return `/${entry.eventName}/${entry.id}/${entry.name}`;
}
