import * as path from "path";
import constants from "server/core/constants";
import {
  addTeamMembers,
  createComment,
  createEntry,
  createEvent,
  createPlatforms,
  createPost,
  createTags,
  createUser,
  insertEntryVotes,
  joinEvent,
  submitHighScore,
  submitThemes,
  voteOnThemes
} from "server/core/db-seed-helpers";
import enums from "server/core/enums";
import settings from "server/core/settings";
import { SETTING_FEATURED_EVENT_NAME } from "server/core/settings-keys";
import { User } from "server/entity/user.entity";
import ratingService from "server/event/ratings/rating.service";
import themeShortlistService from "server/event/theme/theme-shortlist.service";
import tournamentService from "server/event/tournament/tournament.service";
import userService from "server/user/user.service";
import { E2E_ENTRIES, E2E_EVENTS, E2E_POSTS, E2E_USERS } from "./e2e-seed-data";

const PICTURE = path.join(constants.ROOT_PATH, "e2e/fixtures/picture.jpg");

type Users = Record<keyof typeof E2E_USERS, User>;

/**
 * Seeds the end-to-end tests data, on top of a freshly initialized database (administrator account & settings).
 * Each Alakajam! event is set up in a different phase, so that tests can cover them all.
 * Data that tests rely on is described in e2e-seed-data.ts.
 */
export async function seedE2EData(): Promise<void> {
  const users = await seedUsers();
  await createPlatforms([enums.PLATFORM.LINUX, enums.PLATFORM.WINDOWS, enums.PLATFORM.MAC, enums.PLATFORM.WEB, enums.PLATFORM.RETRO]);
  await createTags(["platformer", "MMORPG"]);

  await seedSubmissionsOpenEvent(users);
  await seedPendingEvent();
  await seedThemeVotingEvent(users);
  await seedLiveTournamentEvent(users);
  await seedGameRatingsEvent(users);
  await seedResultsOutEvent(users);
  await seedThemeShortlistEvent(users);
  await seedExternalEntries(users);
}

async function seedUsers(): Promise<Users> {
  return {
    administrator: await userService.findByName(E2E_USERS.administrator),
    gandalf: await createUser(E2E_USERS.gandalf, { avatar: PICTURE }),
    dumbledore: await createUser(E2E_USERS.dumbledore, { avatar: PICTURE, bio: "magicStick.spawn('JAM_GAME')" }),
    yoda: await createUser(E2E_USERS.yoda, { avatar: PICTURE, password: "yodayoda", bio: "My password is **yodayoda**" }),
    saruman: await createUser(E2E_USERS.saruman),
    noEntries: await createUser(E2E_USERS.noEntries),
    streamer: await createUser(E2E_USERS.streamer)
  };
}

/**
 * The featured event, with posts and streamers
 */
async function seedSubmissionsOpenEvent(users: Users): Promise<void> {
  const event = await createEvent({
    ...E2E_EVENTS.submissionsOpen,
    display_dates: "dates",
    status: enums.EVENT.STATUS.OPEN,
    status_theme: enums.EVENT.STATUS_THEME.OFF,
    status_entry: enums.EVENT.STATUS_ENTRY.OPEN,
    status_results: enums.EVENT.STATUS_RESULTS.OFF
  });
  await settings.save(SETTING_FEATURED_EVENT_NAME, event.get("name"));
  await joinEvent(event, [users.administrator, users.streamer], "requested");

  await createEntry(users.dumbledore, {
    ...E2E_ENTRIES.dumbledoreSubmissionsOpen,
    event,
    platforms: [enums.PLATFORM.WINDOWS],
    highScores: { type: enums.ENTRY.HIGH_SCORE_TYPE.NUMBER }
  });

  const plogPost = await createPost(users.administrator, { ...E2E_POSTS.adminPlog, event, body: "Say hello" });
  await createComment(users.dumbledore, plogPost, "Hello");
  const rulesPost = await createPost(users.administrator, {
    ...E2E_POSTS.adminAnnouncement,
    event,
    body: "Let's jam",
    specialPostType: constants.SPECIAL_POST_TYPE_ANNOUNCEMENT
  });
  event.set("status_rules", rulesPost.get("id"));
  await event.save();

  await createPost(users.administrator, {
    ...E2E_POSTS.adminWithoutComments,
    body: "Don't add comments here except in automated tests"
  });
}

async function seedPendingEvent(): Promise<void> {
  const startDate = new Date("2099-01-01T00:00:00.000Z");
  await createEvent({
    ...E2E_EVENTS.pending,
    status: enums.EVENT.STATUS.PENDING,
    status_theme: enums.EVENT.STATUS_THEME.OFF,
    status_entry: enums.EVENT.STATUS_ENTRY.OFF,
    status_results: enums.EVENT.STATUS_RESULTS.OFF,
    started_at: startDate,
    countdown_config: { message: "Book the date!", link: "announcements", date: startDate, phrase: "jam starts", enabled: true }
  });
}

async function seedThemeVotingEvent(users: Users): Promise<void> {
  const event = await createEvent({
    ...E2E_EVENTS.themeVoting,
    status: enums.EVENT.STATUS.OPEN,
    status_theme: enums.EVENT.STATUS_THEME.VOTING,
    status_entry: enums.EVENT.STATUS_ENTRY.OFF
  });
  await submitThemes(users.administrator, event, ["Idea 1", "Idea 2", "Idea 3"]);
  await submitThemes(users.gandalf, event, ["Frodon", "Bilbon", "Gollum"]);
  await submitThemes(users.dumbledore, event, ["Harry", "Hermione", "Ron"]);
}

/**
 * A tournament between two external games, with high scores already submitted by the administrator and dumbledore
 */
async function seedLiveTournamentEvent(users: Users): Promise<void> {
  const event = await createEvent({
    ...E2E_EVENTS.liveTournament,
    status: enums.EVENT.STATUS.OPEN,
    status_entry: enums.EVENT.STATUS_ENTRY.OFF,
    status_tournament: enums.EVENT.STATUS_TOURNAMENT.PLAYING
  });

  const pixelsGame = await createEntry(users.administrator, {
    ...E2E_ENTRIES.adminTournamentGame1,
    highScores: { type: "pixels" },
    picture: PICTURE
  });
  const timeGame = await createEntry(users.administrator, {
    ...E2E_ENTRIES.adminTournamentGame2,
    highScores: { type: enums.ENTRY.HIGH_SCORE_TYPE.TIME, reversed: true },
    picture: PICTURE
  });
  await tournamentService.addTournamentEntry(event.get("id"), pixelsGame.get("id"));
  await tournamentService.addTournamentEntry(event.get("id"), timeGame.get("id"));

  await submitHighScore(users.administrator, pixelsGame, 150, PICTURE);
  await submitHighScore(users.dumbledore, pixelsGame, 500, PICTURE);
  await submitHighScore(users.administrator, timeGame, 359.14, PICTURE);
  await submitHighScore(users.dumbledore, timeGame, 410.1, PICTURE);
}

/**
 * Ratings in progress, with entries in every division
 */
async function seedGameRatingsEvent(users: Users): Promise<void> {
  const event = await createEvent({
    ...E2E_EVENTS.gameRatings,
    status: enums.EVENT.STATUS.OPEN,
    status_entry: enums.EVENT.STATUS_ENTRY.OPEN,
    status_results: enums.EVENT.STATUS_RESULTS.VOTING_RESCUE
  }, {
    category_titles: ["Awesomeness", "Beauty", "Graphics", "Audio"]
  });

  const optedOutEntry = await createEntry(users.administrator, {
    ...E2E_ENTRIES.adminGameRatingsOptedOut,
    event,
    division: "team",
    platforms: [enums.PLATFORM.MAC],
    tags: ["platformer"],
    optouts: ["Graphics", "Audio"],
    allowAnonymous: true
  });
  const rateMeFirstEntry = await createEntry(users.dumbledore, { ...E2E_ENTRIES.dumbledoreGameRatings, event });
  const unrankedEntry = await createEntry(users.yoda, { title: "I'm unranked", event, division: "unranked" });
  await createComment(users.administrator, unrankedEntry, "Cool stuff");
  const teamEntry = await createEntry(users.gandalf, {
    ...E2E_ENTRIES.gandalfGameRatingsTeam,
    event,
    division: "team",
    optouts: ["Graphics", "Audio"]
  });
  await addTeamMembers(users.gandalf, teamEntry, [users.saruman]);

  await insertEntryVotes(event, [
    { user: users.administrator, entry: rateMeFirstEntry, ratings: [5, 5, 7, 5] },
    { user: users.yoda, entry: rateMeFirstEntry, ratings: [4, 3] },
    { user: users.yoda, entry: optedOutEntry, ratings: [6, 2] }
  ]);
}

/**
 * Event over, with computed rankings
 */
async function seedResultsOutEvent(users: Users): Promise<void> {
  const event = await createEvent({
    ...E2E_EVENTS.resultsOut,
    status: enums.EVENT.STATUS.CLOSED,
    status_theme: enums.EVENT.STATUS_THEME.OFF,
    status_entry: enums.EVENT.STATUS_ENTRY.CLOSED,
    status_results: enums.EVENT.STATUS_RESULTS.RESULTS
  }, {
    category_titles: ["Overall", "Graphics", "Audio"]
  });

  const searchableEntry = await createEntry(users.administrator, {
    ...E2E_ENTRIES.adminResultsOut,
    event,
    description: "A Linux platformer with highscores",
    platforms: [enums.PLATFORM.LINUX],
    tags: ["platformer"],
    highScores: { type: enums.ENTRY.HIGH_SCORE_TYPE.NUMBER }
  });
  const worldEntry = await createEntry(users.saruman, { title: "World", event });
  const noGraphicsEntry = await createEntry(users.gandalf, { title: "No graphics, no audio", event, optouts: ["Graphics", "Audio"] });
  const teamEntry = await createEntry(users.yoda, { title: "Team", event, division: "team" });
  await createEntry(users.dumbledore, { title: "Unranked", event, division: "unranked" });

  await insertEntryVotes(event, [
    { user: users.administrator, entry: worldEntry, ratings: [8, 4, 7] },
    { user: users.saruman, entry: searchableEntry, ratings: [4, 5, 5] },
    { user: users.administrator, entry: noGraphicsEntry, ratings: [10] },
    { user: users.administrator, entry: teamEntry, ratings: [6, 7, 6] }
  ]);
  await ratingService.computeRankings(event);
}

/**
 * Theme voting is over: the shortlist gets computed from the votes
 */
async function seedThemeShortlistEvent(users: Users): Promise<void> {
  const event = await createEvent({
    ...E2E_EVENTS.themeShortlist,
    status: enums.EVENT.STATUS.OPEN,
    status_theme: enums.EVENT.STATUS_THEME.VOTING,
    status_entry: enums.EVENT.STATUS_ENTRY.OFF
  });

  await submitThemes(users.administrator, event, ["Cat", "Dog", "Mouse"]);
  await submitThemes(users.gandalf, event, ["Rat", "Horse", "Bat"]);
  await submitThemes(users.dumbledore, event, ["Chicken", "Fish", "Dolphin"]);
  await submitThemes(users.yoda, event, ["Octopus", "Human", "Eagle"]);
  await submitThemes(users.saruman, event, ["Lion", "Tiger", "Panther"]);

  await voteOnThemes(users.dumbledore, event, { up: ["Horse", "Dog", "Rat", "Cat"], down: ["Bat", "Mouse"] });
  await voteOnThemes(users.administrator, event, { up: ["Fish", "Horse", "Chicken", "Bat", "Rat"], down: ["Dolphin"] });
  await voteOnThemes(users.yoda, event, { up: ["Rat", "Horse", "Dog", "Cat"], down: ["Bat", "Mouse", "Chicken", "Fish", "Dolphin"] });
  await voteOnThemes(users.saruman, event, {
    up: ["Human", "Octopus", "Dog", "Eagle", "Chicken", "Fish", "Dolphin"],
    down: ["Mouse", "Rat", "Cat"]
  });
  await voteOnThemes(users.administrator, event, { up: ["Eagle", "Human"], down: ["Octopus", "Lion", "Tiger", "Panther"] });

  event.set("status_theme", enums.EVENT.STATUS_THEME.SHORTLIST);
  await themeShortlistService.computeShortlist(event);
  await event.save();
}

/**
 * Games made outside of Alakajam! events
 */
async function seedExternalEntries(users: Users): Promise<void> {
  const entryWithScores = await createEntry(users.administrator, {
    ...E2E_ENTRIES.adminExternalWithScores,
    highScores: { type: enums.ENTRY.HIGH_SCORE_TYPE.NUMBER }
  });
  await submitHighScore(users.administrator, entryWithScores, 300, PICTURE);

  await createEntry(users.administrator, {
    ...E2E_ENTRIES.adminExternalLudumDare,
    externalEvent: "Ludum Dare 36",
    description: "A Windows FPS made for LD36"
  });
  await createEntry(users.dumbledore, {
    ...E2E_ENTRIES.dumbledoreExternalTeam,
    division: "team",
    highScores: { type: enums.ENTRY.HIGH_SCORE_TYPE.NUMBER }
  });
}
