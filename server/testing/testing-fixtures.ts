import { BookshelfCollection, BookshelfModel, EntryBookshelfModel, PostBookshelfModel } from "bookshelf";
import { createLuxonDate } from "server/core/formats";
import { User } from "server/entity/user.entity";
import entryService from "server/entry/entry.service";
import eventService from "server/event/event.service";
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
 * Creates a post and an entry, trying to make them share the same numeric ID
 * (which is possible as long as posts and entries have separate ID sequences).
 * If IDs can't be aligned (e.g. once posts and entries share a common ID sequence),
 * the returned post & entry simply have different IDs, which is fine for isolation tests.
 */
export async function createTestPostAndEntryWithSameId(
  postAuthor: User,
  entryOwner: User,
  maxAttempts = 50): Promise<{ post: PostBookshelfModel; entry: EntryBookshelfModel; sameId: boolean }> {
  // Filler nodes are owned by a throwaway user so that they don't pollute the given users' data
  const fillerUser = await createTestUser();
  let post = await createTestPost(postAuthor);
  let entry = await createTestEntry(entryOwner);

  for (let attempt = 0; attempt < maxAttempts && post.get("id") !== entry.get("id"); attempt++) {
    if (post.get("id") < entry.get("id")) {
      await reassignToFiller(post, fillerUser);
      post = await createTestPost(postAuthor);
    } else {
      await reassignToFiller(entry, fillerUser);
      entry = await createTestEntry(entryOwner);
    }
  }

  return { post, entry, sameId: post.get("id") === entry.get("id") };
}

async function reassignToFiller(node: BookshelfModel, fillerUser: User): Promise<void> {
  await node.load("userRoles");
  for (const userRole of node.related<BookshelfCollection>("userRoles").models) {
    await userRole.save({
      user_id: fillerUser.id,
      user_name: fillerUser.name,
      user_title: fillerUser.title
    }, { patch: true });
  }
  if (node.tableName === "post") {
    await node.save({ author_user_id: fillerUser.id }, { patch: true });
  }
}
