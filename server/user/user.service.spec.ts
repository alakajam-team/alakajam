/* eslint-disable @typescript-eslint/no-unused-expressions */

import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { expect } from "chai";
import { BookshelfCollection } from "bookshelf";
import constants from "server/core/constants";
import security from "server/core/security";
import { EventParticipation } from "server/entity/event-participation.entity";
import { Node } from "server/entity/node.entity";
import { Event } from "server/entity/event.entity";
import { UserRole } from "server/entity/user-role.entity";
import { User } from "server/entity/user.entity";
import * as models from "server/core/models";
import commentService from "server/post/comment/comment.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import { createTestEntry, createTestEvent, createTestPost, createTestUser } from "server/testing/testing-fixtures";
import { getRepository } from "typeorm";
import userService from "./user.service";

describe("User service", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  beforeEach(() => {
    // XXX Date should be reset before each test
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("find by name", () => {

    it("should return a user when searching a valid name", async () => {
      const result = await userService.findByName("administrator");

      expect(result).to.be.ok;
    });

  });


  describe("find users", () => {

    it("should search users by partial, case-insensitive title", async () => {
      await createUser({ title: "Dumbledore" });

      const foundUsers = await userService.findUsers({ search: "dumb" });
      expect(foundUsers.length).to.equal(1);
      expect(foundUsers[0].title).to.equal("Dumbledore");
    });

    it("should not retrieve the anonymous comment user", async () => {
      const anonymousUser = await userService.findById(constants.ANONYMOUS_USER_ID);
      expect(anonymousUser).to.exist;
      expect(anonymousUser.title).not.to.be.empty;

      const foundUsers = await userService.findUsers({ search: anonymousUser.title });
      expect(foundUsers.length).to.equal(0);
    });

    it("should find users who entered a specific event", async () => {
      const user = await createUser();
      await createEventParticipation(user, 1);

      const foundUsers = await userService.findUsers({ eventId: 1 });
      expect(foundUsers.length).to.equal(1);
    });

    it("should count user entries", async () => {
      const user = await createUser({ title: "Harry Potter" });
      await createUserRole(user, { event_id: undefined });
      await createUserRole(user, { event_id: 1 });
      await createUserRole(user, { event_id: 2 });

      const foundUsersWithEntryCounts = await userService.findUsers({
        search: "harry",
        entriesCount: true
      });
      expect(foundUsersWithEntryCounts.length).to.equal(1);
      expect(foundUsersWithEntryCounts[0].entriesCount).to.equal(3);
      expect(foundUsersWithEntryCounts[0].akjEntriesCount).to.equal(2);
    });

    it("should filter out users without entries", async () => {
      await createUser({ title: "Gandalf" });

      const foundUsers = await userService.findUsers({
        search: "gandalf",
        entriesCount: true,
        withEntries: true
      });
      expect(foundUsers.length).to.equal(0);
    });

    it("should find mods", async () => {
      await createUser({ is_mod: "1" });

      const foundMods = await userService.findUsers({ isMod: true });
      expect(foundMods.length).to.equal(1);
    });

    it("should find admins", async () => {
      const foundAdmins = await userService.findUsers({ isAdmin: true });
      expect(foundAdmins.length).to.equal(1);
      expect(foundAdmins[0].name).to.equal("administrator");
    });

    it("should count users", async () => {
      await createUser({ title: "entrant1" });
      await createUser({ title: "entrant2" });
      await createUser({ title: "entrant3" });

      const foundUsersCount = await userService.countUsers({ search: "entrant" });
      expect(foundUsersCount).to.equal(3);
    });

    it("should support pagination sorting by creation date", async () => {
      await createUser({ title: "A Paginateme", created_at: 1000 as any });
      await createUser({ title: "B Paginateme", created_at: 2000 as any });
      await createUser({ title: "C Paginateme", created_at: 3000 as any });

      // TODO Fix date, currently requires timestamp number to be updated correctly (at least on SQLite)
      // const test = await await userService.findUsers({search: "Paginate"}) as BookshelfCollection;

      const foundUsers = await userService.findUsers({
        search: "Paginateme",
        pageSize: 1,
        page: 2
      });
      expect(foundUsers.length).to.equal(1);
      expect(foundUsers[0].title).to.equal("B Paginateme");
    });

    it("should support ordering", async () => {
      await createUser({ title: "B Orderme" });
      await createUser({ title: "A Orderme" });
      await createUser({ title: "C Orderme" });

      const foundUsers = await userService.findUsers({
        search: "orderme",
        orderBy: "title",
        orderByDesc: true
      });
      expect(foundUsers.map(user => user.get("title")).join(", "))
        .to.equal("C Orderme, B Orderme, A Orderme");
    });

  });


  describe("register", () => {

    it("should reject invalid usernames", async () => {
      const result = await userService.register("email@example.com", "xx", "password");

      expect(result).to.be.a("string");
      expect(result).to.contain("Username is invalid");
    });

  });


  describe("refresh references", () => {

    it("should refresh user roles when user title changes", async () => {
      const user = await createUser();
      const userRole = await createUserRole(user);

      user.title = "New title";
      await userService.save(user);
      await userService.refreshUserReferences(user);

      const updatedUserRole = await findUserRole(userRole.id);
      expect(updatedUserRole.user_title).to.equal("New title");
    });

  });


  describe("entries count from real nodes", () => {

    it("should count entries but not posts", async () => {
      const user = await createTestUser({ title: "Countme Nodes" });
      const event = await createTestEvent();
      await createTestEntry(user, event);
      await createTestEntry(user);
      await createTestPost(user, {}, { eventId: event.get("id") });
      await createTestPost(user);

      const foundUsers = await userService.findUsers({ search: "countme nodes", entriesCount: true });
      expect(foundUsers.length).to.equal(1);
      expect(foundUsers[0].entriesCount).to.equal(2);
      expect(foundUsers[0].akjEntriesCount).to.equal(1);
    });

    it("should not consider users with only posts as having entries", async () => {
      const user = await createTestUser({ title: "Postonly Nodes" });
      await createTestPost(user, {}, { eventId: (await createTestEvent()).get("id") });

      const foundUsers = await userService.findUsers({ search: "postonly nodes", entriesCount: true, withEntries: true });
      expect(foundUsers.length).to.equal(0);
    });

  });


  describe("approved user", () => {

    it("should not approve users without entries", async () => {
      const user = await createTestUser();
      expect(await userService.isApprovedUser(user)).to.be.false;
    });

    it("should approve users with an event entry", async () => {
      const user = await createTestUser();
      await createTestEntry(user, await createTestEvent());
      expect(await userService.isApprovedUser(user)).to.be.true;
    });

    it("should approve team members of an event entry", async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const entry = await createTestEntry(owner, await createTestEvent());
      await security.addUserRight(member, entry, "write");
      expect(await userService.isApprovedUser(member)).to.be.true;
    });

    it("should not approve users with only external entries", async () => {
      const user = await createTestUser();
      await createTestEntry(user);
      expect(await userService.isApprovedUser(user)).to.be.false;
    });

    it("should not approve users with only event posts", async () => {
      const user = await createTestUser();
      await createTestPost(user, {}, { eventId: (await createTestEvent()).get("id") });
      expect(await userService.isApprovedUser(user)).to.be.false;
    });

    it("should approve mods", async () => {
      const mod = await createTestUser({ is_mod: "true" });
      expect(await userService.isApprovedUser(mod)).to.be.true;
    });

  });


  describe("delete user", () => {

    it("should refuse to delete users with entries", async () => {
      const user = await createTestUser();

      const result = await userService.deleteUser(user, 1);

      expect(result.error).to.be.ok;
      expect(await userService.findById(user.id)).to.be.ok;
    });

    it("should delete the user along with their posts, comments, likes and roles", async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      const ownPost = await createTestPost(user);
      const otherPost = await createTestPost(otherUser);
      const otherEntry = await createTestEntry(otherUser);
      await security.addUserRight(user, otherPost, "watch");
      const commentOnPost = await commentService.createComment(user, otherPost, "By deleted user");
      const commentOnEntry = await commentService.createComment(user, otherEntry, "By deleted user");
      const keptComment = await commentService.createComment(otherUser, otherPost, "By other user");
      await likeService.like(otherPost, user.id, "like");
      await likeService.like(ownPost, otherUser.id, "like");
      const ownPostId = ownPost.get("id");

      const result = await userService.deleteUser(user, 0);

      expect(result.error).to.not.be.ok;
      expect(await userService.findById(user.id)).to.not.be.ok;
      expect(await postService.findPostById(ownPostId)).to.not.be.ok;
      expect(await commentService.findCommentById(commentOnPost.get("id"))).to.not.be.ok;
      expect(await commentService.findCommentById(commentOnEntry.get("id"))).to.not.be.ok;
      expect(await commentService.findCommentById(keptComment.get("id"))).to.be.ok;
      expect(await likeService.findLike(otherPost, user.id)).to.not.be.ok;
      expect(await countLikesByUser(otherUser.id)).to.equal(0); // Like on the deleted post
      expect(await getRepository(UserRole).count({ where: { user_id: user.id } })).to.equal(0);

      const fetchedOtherPost = await postService.findPostById(otherPost.get("id"));
      expect(fetchedOtherPost.related<BookshelfCollection>("userRoles").map((role) => role.get("user_id")))
        .to.deep.equal([otherUser.id]);
    });

    it("should delete comments and roles of other users on the deleted user's posts", async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      const ownPost = await createTestPost(user);
      await security.addUserRight(otherUser, ownPost, "write");
      const commentOnOwnPost = await commentService.createComment(otherUser, ownPost, "On deleted post");

      await userService.deleteUser(user, 0);

      expect(await commentService.findCommentById(commentOnOwnPost.get("id"))).to.not.be.ok;
      expect(await getRepository(UserRole).count({ where: { user_id: otherUser.id } })).to.equal(0);
    });

  });


  async function countLikesByUser(userId: number): Promise<number> {
    const count = await models.Like.where({ user_id: userId }).count();
    return parseInt(count.toString(), 10);
  }

  let createdUsers = 0;

  async function createUser(attributes: Partial<User> = {}): Promise<User> {
    const user = await userService.register(
      attributes.email || `test${createdUsers++}@example.com`,
      attributes.name || "user" + (createdUsers++).toString(),
      "testtest");
    if (typeof user === "string") { throw new Error(user); }

    // Support overriding created_at/updated_at
    if (Object.keys(attributes).length > 0) {
      await getRepository(User)
        .createQueryBuilder()
        .update()
        .set(attributes)
        .where({ id: user.id })
        .execute();
    }

    return user;
  }

  async function createUserRole(user: User, attributes: Partial<UserRole> = {}): Promise<UserRole> {
    const entryNode = await getRepository(Node).save({ type: "entry" });
    const userRole = new UserRole();
    userRole.node_id = entryNode.id;
    userRole.user_id = user.id;
    userRole.user_name = user.name;
    userRole.user_title = user.title;
    userRole.permission = "manage";
    Object.assign(userRole, attributes);

    const userRoleRepository = getRepository(UserRole);
    return userRoleRepository.save(userRole);
  }

  async function createEventParticipation(user: User, eventId: number, attributes: Partial<EventParticipation> = {}): Promise<EventParticipation> {
    await createEventIfMissing(eventId);

    const ep = new EventParticipation(eventId, user.id);
    Object.assign(ep, attributes);

    const epRepository = getRepository(EventParticipation);
    return epRepository.save(ep);
  }

  async function createEventIfMissing(eventId: number): Promise<void> {
    const eventRepository = getRepository(Event);
    const existingEvent = await eventRepository.findOne({ where: { id: eventId } });
    if (!existingEvent) {
      const event = new Event();
      event.id = eventId;
      event.name = "test";
      event.title = "test";
      event.status = "open";
      event.status_theme = "disabled";
      event.status_entry = "disabled";
      event.status_rules = "disabled";
      event.status_results = "disabled";
      event.status_tournament = "disabled";
      await eventRepository.save(event);
    }
  }

  function findUserRole(userRoleId: number): Promise<UserRole> {
    const userRoleRepository = getRepository(UserRole);
    return userRoleRepository.findOne(userRoleId);
  }

});
