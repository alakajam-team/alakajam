import * as path from "path";
import { E2E_ENTRIES, E2E_EVENTS, E2E_POSTS, E2E_USERS } from "../../server/testing/e2e/e2e-seed-data";

/*
 * Seeded data used by the tests, see server/testing/e2e/e2e-seed.ts
 */

/**
 * User with administrator rights
 */
export const USER_ADMINISTRATOR = E2E_USERS.administrator;
export const ADMIN_POST_WITHOUT_COMMENTS = E2E_POSTS.adminWithoutComments.id;
export const ADMIN_TOURNAMENT_GAME_1 = entryRef(E2E_ENTRIES.adminTournamentGame1);
export const ADMIN_TOURNAMENT_GAME_2 = entryRef(E2E_ENTRIES.adminTournamentGame2);

/**
 * User without any special rights
 */
export const USER_DUMBLEDORE = E2E_USERS.dumbledore;
export const DUMBLEDORE_ENTRY_WITHOUT_COMMENTS = entryRef(E2E_ENTRIES.dumbledoreExternalTeam);
export const DUMBLEDORE_ENTRY_EMPTY_HIGHSCORES = entryRef(E2E_ENTRIES.dumbledoreExternalTeam);
export const DUMBLEDORE_ENTRY_TEAM_DIVISION = entryRef(E2E_ENTRIES.dumbledoreExternalTeam);
export const DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN = E2E_ENTRIES.dumbledoreSubmissionsOpen.title;

/**
 * Other user without any special rights
 */
export const USER_GANDALF = E2E_USERS.gandalf;
export const GANDALF_RANKED_GAME = entryRef(E2E_ENTRIES.gandalfGameRatingsTeam);

/**
 * Streamer user
 */
export const USER_STREAMER = E2E_USERS.streamer;

export const EVENT_NAME_THEME_VOTING = E2E_EVENTS.themeVoting.name;
export const EVENT_NAME_THEME_SHORTLIST = E2E_EVENTS.themeShortlist.name;
export const EVENT_NAME_SUBMISSIONS_OPEN = E2E_EVENTS.submissionsOpen.name;
export const EVENT_NAME_GAME_RATINGS = E2E_EVENTS.gameRatings.name;
export const EVENT_NAME_LIVE_TOURNAMENT = E2E_EVENTS.liveTournament.name;

export const DEFAULT_PICTURE = path.join(__dirname, "../fixtures/picture.jpg");

function entryRef(entry: { eventName: string; id: number }) {
  return { eventName: entry.eventName, entryId: entry.id };
}
