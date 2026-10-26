/**
 * Contract between the E2E data seed and the E2E tests: identifiers of the seeded data that tests rely on.
 *
 * IDs result from the creation order in the seed (see e2e-seed.ts), which checks them upon insertion:
 * if you reorder or insert data in the seed, update the IDs below accordingly.
 *
 * This file is imported by both the server and the E2E tests, so it must not import anything.
 */

export const E2E_USERS = {
  administrator: "administrator",
  gandalf: "gandalf",
  dumbledore: "dumbledore",
  yoda: "yoda",
  saruman: "saruman",
  noEntries: "noentries",
  streamer: "streamer"
};

export const E2E_EVENTS = {
  submissionsOpen: { id: 1, name: "submissions-open", title: "Submissions open" },
  pending: { id: 2, name: "pending-event", title: "Pending event" },
  themeVoting: { id: 3, name: "theme-voting", title: "Theme voting" },
  liveTournament: { id: 4, name: "live-tournament", title: "Live tournament" },
  gameRatings: { id: 5, name: "game-ratings", title: "Game ratings" },
  resultsOut: { id: 6, name: "results-out", title: "Results out" },
  themeShortlist: { id: 7, name: "theme-shortlist", title: "Theme shortlist" }
};

/** Event name used in the URLs of entries made outside of Alakajam! events */
export const E2E_EXTERNAL_EVENT_NAME = "external-entry";

export const E2E_ENTRIES = {
  dumbledoreSubmissionsOpen: { id: 1, eventName: E2E_EVENTS.submissionsOpen.name, name: "my-game", title: "My game" },
  adminTournamentGame1: { id: 2, eventName: E2E_EXTERNAL_EVENT_NAME, name: "tournament-game-1", title: "Tournament game 1" },
  adminTournamentGame2: { id: 3, eventName: E2E_EXTERNAL_EVENT_NAME, name: "tournament-game-2", title: "Tournament game 2" },
  adminGameRatingsOptedOut: { id: 4, eventName: E2E_EVENTS.gameRatings.name, name: "opted-out", title: "Opted out" },
  dumbledoreGameRatings: { id: 5, eventName: E2E_EVENTS.gameRatings.name, name: "rate-me-first", title: "Rate me first" },
  yodaGameRatingsUnranked: { id: 6, eventName: E2E_EVENTS.gameRatings.name, name: "im-unranked", title: "I'm unranked" },
  gandalfGameRatingsTeam: { id: 7, eventName: E2E_EVENTS.gameRatings.name, name: "team-game", title: "Team game" },
  adminResultsOut: { id: 8, eventName: E2E_EVENTS.resultsOut.name, name: "game-search-test-1", title: "Game search test #1" },
  adminExternalWithScores: { id: 13, eventName: E2E_EXTERNAL_EVENT_NAME, name: "my-external-entry", title: "My external entry" },
  adminExternalLudumDare: { id: 14, eventName: E2E_EXTERNAL_EVENT_NAME, name: "game-search-test-2", title: "Game search test #2" },
  dumbledoreExternalTeam: { id: 15, eventName: E2E_EXTERNAL_EVENT_NAME, name: "my-team-game", title: "My team game" }
};

export const E2E_POSTS = {
  adminPlog: { id: 1, name: "plog-post", title: "Plog post" },
  adminAnnouncement: { id: 2, name: "welcome-to-the-event", title: "Welcome to the event" },
  adminWithoutComments: { id: 3, name: "comment-testing", title: "Comment testing" }
};
