import { BookshelfModel, EntryBookshelfModel, PostBookshelfModel } from "bookshelf";
import enums from "server/core/enums";
import { createLuxonDate } from "server/core/formats";
import { User } from "server/entity/user.entity";
import entryService from "server/entry/entry.service";
import eventService from "server/event/event.service";
import eventTemplateService from "server/event/manage/create/event-template.service";
import eventPresetService from "server/event/manage/settings/event-preset.service";
import postService from "server/post/post.service";
import userService from "server/user/user.service";

/**
 * Fixture helpers for DB-backed unit tests.
 * They rely on the public services as much as possible, so that they keep working
 * whatever the underlying storage of nodes (posts/entries) and their roles, comments & likes.
 */

let fixtureCounter = 0;

function nextId(): number {
  return ++fixtureCounter;
}

export async function createTestUser(attributes: Partial<User> = {}): Promise<User> {
  const id = nextId();
  const user = await userService.register(
    attributes.email || `fixture${id}@example.com`,
    attributes.name || `fixtureuser${id}`,
    "testtest");
  if (typeof user === "string") {
    throw new Error(user);
  }
  if (Object.keys(attributes).length > 0) {
    Object.assign(user, attributes);
    await userService.save(user);
  }
  return user;
}

export async function createTestEvent(attributes: Record<string, any> = {}): Promise<BookshelfModel> {
  const id = nextId();
  const event = eventService.createEvent();
  event.set({
    title: `Fixture event ${id}`,
    name: `fixture-event-${id}`,
    ...attributes
  });
  await event.save();
  return event;
}

export const TEST_PRESET_OFFSET_MS = 48 * 3600 * 1000;

/**
 * Creates an event preset resembling a "jam started" phase, with a 48h countdown offset.
 */
export async function createTestPreset(attributes: Record<string, any> = {}): Promise<BookshelfModel> {
  const id = nextId();
  const preset = eventPresetService.initEventPreset();
  preset.set({
    title: `Fixture preset ${id}`,
    status: enums.EVENT.STATUS.OPEN,
    status_rules: enums.EVENT.STATUS_RULES.OFF,
    status_theme: enums.EVENT.STATUS_THEME.RESULTS,
    status_entry: enums.EVENT.STATUS_ENTRY.OPEN,
    status_results: enums.EVENT.STATUS_RESULTS.DISABLED,
    status_tournament: enums.EVENT.STATUS_TOURNAMENT.DISABLED,
    countdown_config: {
      message: "Submit your game",
      link: "create-entry",
      phrase: "ends",
      offset: TEST_PRESET_OFFSET_MS,
      enabled: true
    },
    ...attributes
  });
  await preset.save();
  return preset;
}

export async function createTestTemplate(attributes: Record<string, any> = {}): Promise<BookshelfModel> {
  const id = nextId();
  const template = eventTemplateService.initEventTemplate();
  template.set({
    title: `Fixture template ${id}`,
    ...attributes
  });
  await template.save();
  return template;
}

/**
 * Creates a post through the post service, then sets the given attributes.
 * By default, the post is published (in the past) so that it is visible.
 */
export async function createTestPost(
  author: User,
  attributes: Record<string, any> = {},
  options: { eventId?: number } = {}): Promise<PostBookshelfModel> {
  const post = await postService.createPost(author, options.eventId);
  const id = nextId();
  post.set({
    title: `Fixture post ${id}`,
    body: "Post body",
    published_at: createLuxonDate().minus({ hours: 1 }).toJSDate(),
    event_id: options.eventId,
    ...attributes
  });
  await post.save();
  return post;
}

export async function createTestEntry(
  owner: User,
  event?: BookshelfModel,
  attributes: Record<string, any> = {}): Promise<EntryBookshelfModel> {
  const entry = await entryService.createEntry(owner, event);
  const id = nextId();
  entry.set({
    title: `Fixture entry ${id}`,
    ...attributes
  });
  await entry.save();
  return entry;
}

/**
 * Creates a post and an entry. They used to be able to share the same numeric ID,
 * which was a source of bugs that isolation tests keep checking.
 */
export async function createTestPostAndEntry(
  postAuthor: User,
  entryOwner: User): Promise<{ post: PostBookshelfModel; entry: EntryBookshelfModel }> {
  return {
    post: await createTestPost(postAuthor),
    entry: await createTestEntry(entryOwner)
  };
}
