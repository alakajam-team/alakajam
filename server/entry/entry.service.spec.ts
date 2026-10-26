/* eslint-disable @typescript-eslint/no-unused-expressions */

import { BookshelfCollection } from "bookshelf";
import { expect } from "chai";
import security from "server/core/security";
import { UserRole } from "server/entity/user-role.entity";
import commentService from "server/post/comment/comment.service";
import postService from "server/post/post.service";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import {
  createTestEntry,
  createTestEvent,
  createTestPost,
  createTestPostAndEntryWithSameId,
  createTestUser
} from "server/testing/testing-fixtures";
import { getRepository } from "typeorm";
import { afterAll, beforeAll, describe, it } from "vitest";
import entryService from "./entry.service";

describe("Entry service", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("create entry", () => {

    it("should create an entry with a manage role for its owner", async () => {
      const user = await createTestUser();
      const event = await createTestEvent();

      const entry = await entryService.createEntry(user, event);

      const fetchedEntry = await entryService.findEntryById(entry.get("id"));
      expect(fetchedEntry.get("event_id")).to.equal(event.get("id"));
      expect(fetchedEntry.get("event_name")).to.equal(event.get("name"));
      expect(fetchedEntry.related("details").get("entry_id")).to.equal(entry.get("id"));
      const userRoles = fetchedEntry.related<BookshelfCollection>("userRoles");
      expect(userRoles.length).to.equal(1);
      expect(userRoles.at(0).get("user_id")).to.equal(user.id);
      expect(userRoles.at(0).get("user_name")).to.equal(user.name);
      expect(userRoles.at(0).get("permission")).to.equal("manage");
      expect(userRoles.at(0).get("event_id")).to.equal(event.get("id"));
      expect(security.canUserManage(user, fetchedEntry)).to.be.true;
    });

    it("should support external entries (without event)", async () => {
      const user = await createTestUser();

      const entry = await entryService.createEntry(user);

      const fetchedEntry = await entryService.findEntryById(entry.get("id"));
      expect(fetchedEntry.get("event_id")).to.not.be.ok;
      const userRoles = fetchedEntry.related<BookshelfCollection>("userRoles");
      expect(userRoles.length).to.equal(1);
      expect(userRoles.at(0).get("event_id")).to.not.be.ok;
    });

    it("should refuse a second entry for the same event", async () => {
      const user = await createTestUser();
      const event = await createTestEvent();
      await entryService.createEntry(user, event);

      let error: Error | undefined;
      try {
        await entryService.createEntry(user, event);
      } catch (e) {
        error = e;
      }
      expect(error?.message).to.contain("already has an entry");
    });

  });

  describe("find user entries", () => {

    it("should find the entry of a user for an event", async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(user, event);
      await createTestEntry(otherUser, event);

      const foundEntry = await entryService.findUserEntryForEvent(user, event.get("id"));
      expect(foundEntry.get("id")).to.equal(entry.get("id"));

      const otherEvent = await createTestEvent();
      expect(await entryService.findUserEntryForEvent(user, otherEvent.get("id"))).to.not.be.ok;
    });

    it("should find all entries of a user", async () => {
      const user = await createTestUser();
      const event1 = await createTestEvent();
      const event2 = await createTestEvent();
      const entry1 = await createTestEntry(user, event1);
      const entry2 = await createTestEntry(user, event2);
      const externalEntry = await createTestEntry(user);
      await createTestEntry(await createTestUser(), event1);

      const entries = await entryService.findUserEntries(user);
      expect(entries.map((entry) => entry.get("id")).sort())
        .to.deep.equal([entry1.get("id"), entry2.get("id"), externalEntry.get("id")].sort());
    });

    it("should find entries of a team member", async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const entry = await createTestEntry(owner);
      await security.addUserRight(member, entry, "entry", "write");

      const entries = await entryService.findUserEntries(member);
      expect(entries.map((e) => e.get("id"))).to.deep.equal([entry.get("id")]);
    });

    it("should find the latest event entry of a user", async () => {
      const user = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(user, event);
      await createTestEntry(user); // External entries are ignored

      const latestEntry = await entryService.findLatestUserEntry(user);
      expect(latestEntry.get("id")).to.equal(entry.get("id"));
    });

    it("should find entries through the userId filter", async () => {
      const user = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(user, event);
      await createTestEntry(await createTestUser(), event);

      const entries = await entryService.findEntries({ userId: user.id, pageSize: false as any });
      expect((entries as BookshelfCollection).map((e) => e.get("id"))).to.deep.equal([entry.get("id")]);
    });

    it("should not find entries through roles on a post sharing the same ID", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const event = await createTestEvent();
      const { post, entry } = await createTestPostAndEntryWithSameId(postAuthor, entryOwner);
      await entry.save({ event_id: event.get("id") }, { patch: true });
      await post.save({ event_id: event.get("id") }, { patch: true });

      expect((await entryService.findUserEntries(postAuthor)).length).to.equal(0);
      expect(await entryService.findUserEntryForEvent(postAuthor, event.get("id"))).to.not.be.ok;
      expect(await entryService.findLatestUserEntry(postAuthor)).to.not.be.ok;
      const entries = await entryService.findEntries({ userId: postAuthor.id, pageSize: false as any });
      expect((entries as BookshelfCollection).length).to.equal(0);

      expect((await entryService.findUserEntries(entryOwner)).map((e) => e.get("id"))).to.deep.equal([entry.get("id")]);
      expect((await entryService.findUserEntryForEvent(entryOwner, event.get("id"))).get("id")).to.equal(entry.get("id"));
    });

  });

  describe("find entries not reviewed by user", () => {
    // NB. notReviewedById is typed as a string, but must actually be a number (as passed by the controllers):
    // a string is interpreted by Knex as a column name in the JOIN clauses, which makes the query fail.

    it("should hide entries commented or owned by the user", async () => {
      const reviewer = await createTestUser();
      const event = await createTestEvent();
      const ownEntry = await createTestEntry(reviewer, event);
      const commentedEntry = await createTestEntry(await createTestUser(), event);
      const otherEntry = await createTestEntry(await createTestUser(), event);
      await commentService.createComment(reviewer, commentedEntry, "Nice game");

      const entries = await entryService.findEntries({
        eventId: event.get("id"),
        notReviewedById: reviewer.id as any,
        pageSize: false as any
      }) as BookshelfCollection;

      const entryIds = entries.map((e) => e.get("id"));
      expect(entryIds).to.deep.equal([otherEntry.get("id")]);
      expect(entryIds).to.not.include(ownEntry.get("id"));
    });

    it("should not hide entries just because the user commented a post sharing the same ID", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const reviewer = await createTestUser();
      const event = await createTestEvent();
      const { post, entry } = await createTestPostAndEntryWithSameId(postAuthor, entryOwner);
      await entry.save({ event_id: event.get("id") }, { patch: true });
      await commentService.createComment(reviewer, post, "Comment on the post");

      const entries = await entryService.findEntries({
        eventId: event.get("id"),
        notReviewedById: reviewer.id as any,
        pageSize: false as any
      }) as BookshelfCollection;

      expect(entries.map((e) => e.get("id"))).to.deep.equal([entry.get("id")]);
    });

    // BUG (current behaviour): the "hide own entry" join on user_role only matches node_id, not node_type,
    // so an entry gets hidden from a reviewer who happens to have a role on a post with the same numeric ID.
    // Should be fixed by the node table refactoring (#682).
    it.skip("should not hide entries just because the user has a role on a post sharing the same ID", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const event = await createTestEvent();
      const { entry } = await createTestPostAndEntryWithSameId(postAuthor, entryOwner);
      await entry.save({ event_id: event.get("id") }, { patch: true });

      const entries = await entryService.findEntries({
        eventId: event.get("id"),
        notReviewedById: postAuthor.id as any,
        pageSize: false as any
      }) as BookshelfCollection;

      expect(entries.map((e) => e.get("id"))).to.deep.equal([entry.get("id")]);
    });

  });

  describe("delete entry", () => {

    it("should delete the entry along with its roles and comments", async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const commenter = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(owner, event);
      await security.addUserRight(member, entry, "entry", "write");
      const comment = await commentService.createComment(commenter, entry, "Nice game");
      const entryId = entry.get("id");

      await entryService.deleteEntry(entry);

      expect(await entryService.findEntryById(entryId)).to.not.be.ok;
      expect(await countUserRoles(owner.id)).to.equal(0);
      expect(await countUserRoles(member.id)).to.equal(0);
      expect(await commentService.findCommentById(comment.get("id"))).to.not.be.ok;
      expect(await entryService.findUserEntryForEvent(owner, event.get("id"))).to.not.be.ok;
    });

    it("should detach the entry posts without deleting them", async () => {
      const owner = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(owner, event);
      const post = await createTestPost(owner, { entry_id: entry.get("id") }, { eventId: event.get("id") });

      await entryService.deleteEntry(entry);

      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(fetchedPost).to.be.ok;
      expect(fetchedPost.get("entry_id")).to.not.be.ok;
    });

    it("should leave a post sharing the same ID untouched", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const { post, entry } = await createTestPostAndEntryWithSameId(postAuthor, entryOwner);
      const postComment = await commentService.createComment(entryOwner, post, "Comment on post");
      await commentService.createComment(postAuthor, entry, "Comment on entry");
      const postId = post.get("id");

      await entryService.deleteEntry(entry);

      const fetchedPost = await postService.findPostById(postId);
      expect(fetchedPost).to.be.ok;
      expect(fetchedPost.related<BookshelfCollection>("userRoles").map((role) => role.get("user_id")))
        .to.deep.equal([postAuthor.id]);
      expect(security.canUserManage(postAuthor, fetchedPost)).to.be.true;
      expect(await commentService.findCommentById(postComment.get("id"))).to.be.ok;
      expect(await countUserRoles(entryOwner.id)).to.equal(0);
    });

  });

  function countUserRoles(userId: number): Promise<number> {
    return getRepository(UserRole).count({ where: { user_id: userId } });
  }

});
