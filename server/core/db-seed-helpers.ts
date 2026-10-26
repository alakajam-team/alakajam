import { BookshelfModel, EntryBookshelfModel, PostBookshelfModel } from "bookshelf";
import { User } from "server/entity/user.entity";
import entryPicturesService from "server/entry/entry-pictures.service";
import entryService from "server/entry/entry.service";
import highscoreService from "server/entry/highscore/highscore.service";
import platformRepository from "server/entry/platform/platform.repository";
import platformService from "server/entry/platform/platform.service";
import tagService from "server/entry/tag/tag.service";
import teamInviteService from "server/entry/team/team-invite.service";
import teamService from "server/entry/team/team.service";
import eventParticipationService from "server/event/dashboard/event-participation.service";
import eventService from "server/event/event.service";
import ratingService from "server/event/ratings/rating.service";
import themeStatsService from "server/event/theme/theme-stats.service";
import themeVotingService from "server/event/theme/theme-voting.service";
import themeService from "server/event/theme/theme.service";
import commentService from "server/post/comment/comment.service";
import postService from "server/post/post.service";
import userService from "server/user/user.service";
import db from "./db";
import enums from "./enums";
import fileStorage from "./file-storage";

/*
 * Building blocks to seed databases (development samples, end-to-end tests).
 * They go through the same services as the website features, so that the seeded data stays consistent
 * with what users would produce.
 */

/**
 * Optional ID expected for a seeded model, checked upon creation.
 * Useful when other code relies on IDs, which result from the creation order.
 */
export interface ExpectedId {
  id?: number;
}

/**
 * Registers an approved user, with a "<name>@example.com" email.
 * Unless specified, the password is the user name.
 */
export async function createUser(name: string, options: {
  title?: string;
  password?: string;
  bio?: string;
  /** Path to a picture file */
  avatar?: string;
  admin?: boolean;
} = {}): Promise<User> {
  const user = await userService.register(`${name}@example.com`, name, options.password || name);
  if (typeof user === "string") {
    throw new Error(`Failed to register ${name}: ${user}`);
  }
  user.approbation_state = "approved";
  if (options.title) {
    user.title = options.title;
  }
  if (options.bio) {
    user.details.body = options.bio;
  }
  if (options.admin) {
    user.is_admin = "true";
  }
  if (options.avatar) {
    await fileStorage.savePictureToModel(user, "avatar", options.avatar, false, "/user/" + user.id, { maxDiagonal: 500 });
  }
  await userService.save(user);
  return user;
}

export async function createPlatforms(names: string[]): Promise<void> {
  for (const name of names) {
    await platformService.save(platformRepository.createPlatform(name));
  }
}

export async function createTags(values: string[]): Promise<void> {
  for (const value of values) {
    await tagService.createTag(value);
  }
}

/**
 * Creates an event along with its details.
 * @param attributes Event attributes (name, title, statuses...)
 * @param details Event details attributes (category titles...)
 */
export async function createEvent(
  attributes: ExpectedId & { name: string; title: string } & Record<string, unknown>,
  details: Record<string, unknown> = {}): Promise<BookshelfModel> {
  const { id, ...eventAttributes } = attributes;
  const event = eventService.createEvent();
  event.set(eventAttributes);
  await event.save();
  assertExpectedId(event, { id }, attributes.title);

  const eventDetails = event.related<BookshelfModel>("details");
  eventDetails.set({ category_titles: [], flags: {}, ...details }); // Always set by the event edition form
  await eventDetails.save();
  return event;
}

/**
 * Makes users join an event. Pass a streamer status to also register them as streamers.
 */
export async function joinEvent(event: BookshelfModel, users: User[], streamerStatus?: "requested" | "approved"): Promise<void> {
  for (const user of users) {
    await eventParticipationService.joinEvent(event, user);
    if (streamerStatus) {
      await eventParticipationService.setStreamingPreferences(event, user, { streamerStatus, streamerDescription: "" });
    }
  }
}

export interface EntryOptions extends ExpectedId {
  title: string;
  /** Alakajam! event. Leave empty for external entries */
  event?: BookshelfModel;
  /** For entries made outside of Alakajam! events */
  externalEvent?: string;
  description?: string;
  division?: "solo" | "team" | "unranked";
  platforms?: string[];
  tags?: string[];
  /** Rating categories the entry opts out of */
  optouts?: string[];
  allowAnonymous?: boolean;
  highScores?: { type: string; reversed?: boolean };
  /** Path to a picture file */
  picture?: string;
  /** Entries are published unless specified */
  unpublished?: boolean;
}

/**
 * Creates an entry, mirroring what the entry edition form does.
 * When the entry belongs to an event, its owner joins the event too.
 */
export async function createEntry(owner: User, options: EntryOptions): Promise<EntryBookshelfModel> {
  const { event } = options;
  if (event) {
    await joinEvent(event, [owner]);
  }

  const entry = await entryService.createEntry(owner, event);
  assertExpectedId(entry, options, options.title);
  await tagService.updateEntryTags(entry, options.tags || []);

  entry.set({
    title: options.title,
    description: options.description,
    division: options.division || enums.DIVISION.SOLO,
    allow_anonymous: Boolean(options.allowAnonymous),
    status_high_score: highScoreStatus(options.highScores),
    external_event: options.externalEvent,
    published_at: options.unpublished ? null : new Date()
  });
  if (options.picture) {
    await entryPicturesService.setEntryPicture(entry, options.picture);
  }
  await entry.save();

  const entryDetails = entry.related<BookshelfModel>("details");
  entryDetails.set({
    optouts: options.optouts || [],
    high_score_type: options.highScores?.type || enums.ENTRY.HIGH_SCORE_TYPE.NUMBER
  });
  await entryDetails.save();

  await platformRepository.setEntryPlatforms(entry, await platformRepository.findAllByName(options.platforms || []));
  await ratingService.refreshEntryKarma(entry, event);
  if (event) {
    await eventService.refreshEventCounts(event);
  }
  return entry;
}

/**
 * Adds members to a team entry, by sending invites that they accept.
 */
export async function addTeamMembers(owner: User, entry: EntryBookshelfModel, members: User[]): Promise<void> {
  await teamService.setTeamMembers(owner, entry, [owner, ...members].map((user) => user.id));
  for (const member of members) {
    await teamInviteService.acceptInvite(member, entry);
  }
}

/**
 * Submits a high score, with a picture as a proof.
 * Tournament scores get refreshed too, if the entry is played in a tournament.
 * @param proof Path to a picture file
 */
export async function submitHighScore(user: User, entry: EntryBookshelfModel, score: number, proof: string): Promise<void> {
  const entryScore = await highscoreService.createEntryScore(user.id, entry.get("id"));
  entryScore.set("score", score);
  await fileStorage.savePictureToModel(entryScore, "proof", proof, false, `/scores/${entry.get("id")}/${user.id}`);
  const result = await highscoreService.submitEntryScore(entryScore, entry);
  if ("error" in result) {
    throw new Error(`Failed to submit score of ${user.name}: ${result.error}`);
  }
}

/**
 * Inserts entry votes, then refreshes ratings & karma of all event entries.
 * Votes are inserted in bulk on purpose: going through ratingService.saveEntryVote() would refresh
 * everything upon every vote (which is slow), partly in the background (which would make seeds non-deterministic).
 */
export async function insertEntryVotes(
  event: BookshelfModel, votes: Array<{ user: User; entry: EntryBookshelfModel; ratings: number[] }>): Promise<void> {
  const now = db.knex.fn.now();
  await db.knex("entry_vote").insert(votes.map(({ user, entry, ratings }) => ({
    user_id: user.id,
    entry_id: entry.get("id"),
    event_id: event.get("id"),
    ...Object.fromEntries(ratings.map((rating, index) => ["vote_" + (index + 1), rating])),
    created_at: now,
    updated_at: now
  })));

  await event.load("entries");
  for (const entry of event.related<any>("entries").models as EntryBookshelfModel[]) {
    await ratingService.refreshEntryRatings(entry);
    await ratingService.refreshEntryKarma(entry, event);
  }
}

/**
 * Submits the theme ideas of a user.
 */
export async function submitThemes(user: User, event: BookshelfModel, titles: string[]): Promise<void> {
  await themeService.saveThemeSubmissions(user, event, titles.map((title) => ({ title })));
  await themeStatsService.refreshEventThemeStats(event); // Already triggered by the submission, but in the background
}

/**
 * Votes on themes, by title. Like on the website, low-rated themes get eliminated every few votes.
 */
export async function voteOnThemes(user: User, event: BookshelfModel, votes: { up?: string[]; down?: string[] }): Promise<void> {
  const themes = await themeService.findAllThemes(event);
  const voteOn = async (title: string, score: number) => {
    const theme = themes.models.find((t) => t.get("title") === title);
    if (!theme) {
      throw new Error(`Theme not found: ${title}`);
    }
    await themeVotingService.saveVote(user, event, theme.get("id"), score);
  };

  for (const title of votes.up || []) {
    await voteOn(title, 1);
  }
  for (const title of votes.down || []) {
    await voteOn(title, -1);
  }
}

/**
 * Creates a published post.
 */
export async function createPost(author: User, options: ExpectedId & {
  title: string;
  body: string;
  event?: BookshelfModel;
  entry?: BookshelfModel;
  specialPostType?: string;
}): Promise<PostBookshelfModel> {
  const post = await postService.createPost(author, options.event?.get("id"));
  assertExpectedId(post, options, options.title);
  post.set({
    title: options.title,
    body: options.body,
    event_id: options.event?.get("id"),
    entry_id: options.entry?.get("id"),
    special_post_type: options.specialPostType,
    published_at: new Date()
  });
  await post.save();
  return post;
}

/**
 * Comments on a post or an entry.
 */
export async function createComment(user: User, node: PostBookshelfModel | EntryBookshelfModel, body: string): Promise<void> {
  await commentService.createComment(user, node, body);
  await postService.refreshCommentCount(node);
}

function highScoreStatus(highScores: EntryOptions["highScores"]): string {
  if (!highScores) {
    return enums.ENTRY.STATUS_HIGH_SCORE.OFF;
  }
  return highScores.reversed ? enums.ENTRY.STATUS_HIGH_SCORE.REVERSED : enums.ENTRY.STATUS_HIGH_SCORE.NORMAL;
}

function assertExpectedId(model: BookshelfModel, expected: ExpectedId, label: string): void {
  if (expected.id !== undefined && model.get("id") !== expected.id) {
    throw new Error(`Seeded "${label}" got ID ${model.get("id")} instead of ${expected.id}: check the seed order`);
  }
}
