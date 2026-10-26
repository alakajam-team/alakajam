/* eslint-disable @typescript-eslint/no-unused-expressions */

import { BookshelfCollection, BookshelfModel } from "bookshelf";
import { expect } from "chai";
import { createLuxonDate } from "server/core/formats";
import * as models from "server/core/models";
import entryService from "server/entry/entry.service";
import commentService from "server/post/comment/comment.service";
import postService from "server/post/post.service";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import {
  createTestEntry,
  createTestEvent,
  createTestPost,
  createTestPostAndEntry,
  createTestUser
} from "server/testing/testing-fixtures";
import { afterAll, beforeAll, describe, it } from "vitest";
import enums from "./enums";
import security from "./security";

describe("Security", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("permission helpers", () => {

    it("should list permissions equal or above", () => {
      expect(security.getPermissionsEqualOrAbove("read")).to.deep.equal(["read", "watch", "write", "manage"]);
      expect(security.getPermissionsEqualOrAbove("write")).to.deep.equal(["write", "manage"]);
      expect(() => security.getPermissionsEqualOrAbove("invalid" as any)).to.throw();
    });

    it("should find the highest permission", () => {
      expect(security.getHighestPermission(["watch", "manage", "read"])).to.equal("manage");
      expect(security.getHighestPermission(["read"])).to.equal("read");
    });

  });

  describe("post permissions", () => {

    it("should give all permissions to the post author", async () => {
      const author = await createTestUser();
      const post = await createTestPost(author);

      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(security.canUserRead(author, fetchedPost)).to.be.true;
      expect(security.isUserWatching(author, fetchedPost)).to.be.true;
      expect(security.canUserWrite(author, fetchedPost)).to.be.true;
      expect(security.canUserManage(author, fetchedPost)).to.be.true;
    });

    it("should give no write permissions to other users", async () => {
      const author = await createTestUser();
      const otherUser = await createTestUser();
      const post = await createTestPost(author);

      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(security.canUserWrite(otherUser, fetchedPost)).to.be.false;
      expect(security.canUserManage(otherUser, fetchedPost)).to.be.false;
      expect(security.canUserWrite(undefined, fetchedPost)).to.be.false;
    });

    it("should let anyone read published posts by approved users", async () => {
      const approvedAuthor = await createTestUser({ approbation_state: "approved" });
      const pendingAuthor = await createTestUser();
      const otherUser = await createTestUser();
      const approvedPost = await postService.findPostById((await createTestPost(approvedAuthor)).get("id"));
      const pendingPost = await postService.findPostById((await createTestPost(pendingAuthor)).get("id"));

      expect(security.canUserRead(undefined, approvedPost)).to.be.true;
      expect(security.canUserRead(otherUser, approvedPost)).to.be.true;
      expect(security.canUserRead(undefined, pendingPost)).to.be.false;
      expect(security.canUserRead(otherUser, pendingPost)).to.be.false;
      expect(security.canUserRead(pendingAuthor, pendingPost)).to.be.true;
    });

    it("should only let users with roles read drafts", async () => {
      const author = await createTestUser({ approbation_state: "approved" });
      const reader = await createTestUser();
      const otherUser = await createTestUser();
      const post = await createTestPost(author, { published_at: createLuxonDate().plus({ days: 1 }).toJSDate() });
      await security.addUserRight(reader, post, "read");

      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(security.canUserRead(author, fetchedPost)).to.be.true;
      expect(security.canUserRead(reader, fetchedPost)).to.be.true;
      expect(security.canUserWrite(reader, fetchedPost)).to.be.false;
      expect(security.canUserRead(otherUser, fetchedPost)).to.be.false;
      expect(security.canUserRead(undefined, fetchedPost)).to.be.false;
    });

    it("should let mods and admins in when allowed", async () => {
      const author = await createTestUser();
      const mod = await createTestUser({ is_mod: "true" });
      const admin = await createTestUser({ is_admin: "true" });
      const post = await postService.findPostById((await createTestPost(author)).get("id"));

      expect(security.canUserManage(mod, post)).to.be.false;
      expect(security.canUserManage(mod, post, { allowMods: true })).to.be.true;
      expect(security.canUserManage(mod, post, { allowAdmins: true })).to.be.false;
      expect(security.canUserManage(admin, post, { allowMods: true })).to.be.true;
      expect(security.canUserManage(admin, post, { allowAdmins: true })).to.be.true;
    });

    it("should require user roles to be loaded", async () => {
      const author = await createTestUser();
      const post = await createTestPost(author, { published_at: null });
      const postWithoutRoles = await models.Post.where("id", post.get("id")).fetch();

      expect(() => security.canUserWrite(author, postWithoutRoles)).to.throw();
    });

    it("should always refuse when no model is given", async () => {
      const admin = await createTestUser({ is_admin: "true" });
      expect(security.canUserRead(admin, undefined, { allowAdmins: true })).to.be.false;
    });

  });

  describe("entry permissions", () => {

    it("should give all permissions to the entry owner", async () => {
      const owner = await createTestUser();
      const otherUser = await createTestUser();
      const entry = await entryService.findEntryById((await createTestEntry(owner)).get("id"));

      expect(security.canUserManage(owner, entry)).to.be.true;
      expect(security.canUserWrite(otherUser, entry)).to.be.false;
    });

    it("should give write permissions to team members", async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const entry = await createTestEntry(owner);
      await security.addUserRight(member, entry, "write");

      const fetchedEntry = await entryService.findEntryById(entry.get("id"));
      expect(security.canUserRead(member, fetchedEntry)).to.be.true;
      expect(security.canUserWrite(member, fetchedEntry)).to.be.true;
      expect(security.canUserManage(member, fetchedEntry)).to.be.false;
    });

  });

  describe("comment permissions", () => {

    it("should only let the comment author edit it", async () => {
      const author = await createTestUser();
      const commenter = await createTestUser();
      const post = await createTestPost(author);
      const comment = await commentService.createComment(commenter, post, "Comment");

      expect(security.canUserWrite(commenter, comment)).to.be.true;
      expect(security.canUserManage(commenter, comment)).to.be.true;
      expect(security.canUserWrite(author, comment)).to.be.false;
      expect(security.canUserWrite(undefined, comment)).to.be.false;
    });

    it("should let users read comments on readable nodes", async () => {
      const author = await createTestUser({ approbation_state: "approved" });
      const draftAuthor = await createTestUser();
      const publishedPost = await createTestPost(author);
      const draftPost = await createTestPost(draftAuthor, { published_at: null });
      const publishedComment = await commentService.createComment(author, publishedPost, "Comment");
      const draftComment = await commentService.createComment(draftAuthor, draftPost, "Comment");
      await publishedComment.load(["post", "post.author"]);
      await draftComment.load(["post", "post.author", "post.userRoles"]);

      expect(security.canUserRead(undefined, publishedComment)).to.be.true;
      expect(security.canUserRead(undefined, draftComment)).to.be.false;
      expect(security.canUserRead(draftAuthor, draftComment)).to.be.true;
    });

  });

  describe("event permissions", () => {

    it("should let anyone read events but only mods edit them, and only admins once closed", async () => {
      const user = await createTestUser();
      const mod = await createTestUser({ is_mod: "true" });
      const admin = await createTestUser({ is_admin: "true" });
      const openEvent = await createTestEvent({ status: enums.EVENT.STATUS.OPEN });
      const closedEvent = await createTestEvent({ status: enums.EVENT.STATUS.CLOSED });

      expect(security.canUserRead(undefined, openEvent)).to.be.true;
      expect(security.canUserWrite(user, openEvent)).to.not.be.ok;
      expect(security.canUserWrite(mod, openEvent)).to.be.ok;
      expect(security.canUserWrite(mod, closedEvent)).to.not.be.ok;
      expect(security.canUserWrite(admin, closedEvent)).to.be.ok;
    });

  });

  describe("add user right", () => {

    it("should create a role on a post", async () => {
      const author = await createTestUser();
      const user = await createTestUser();
      const event = await createTestEvent();
      const post = await createTestPost(author, {}, { eventId: event.get("id") });

      await security.addUserRight(user, post, "watch");

      const roles = await findRolesOfUser(post, user);
      expect(roles.length).to.equal(1);
      expect(roles[0].get("permission")).to.equal("watch");
      expect(roles[0].get("user_name")).to.equal(user.name);
      expect(roles[0].get("event_id")).to.equal(event.get("id"));
    });

    it("should upgrade an existing role to a higher permission, but never downgrade it", async () => {
      const owner = await createTestUser();
      const user = await createTestUser();
      const entry = await createTestEntry(owner);

      await security.addUserRight(user, entry, "read");
      await security.addUserRight(user, entry, "write");
      let roles = await findRolesOfUser(entry, user);
      expect(roles.map((role) => role.get("permission"))).to.deep.equal(["write"]);

      await security.addUserRight(user, entry, "watch");
      roles = await findRolesOfUser(entry, user);
      expect(roles.map((role) => role.get("permission"))).to.deep.equal(["write"]);
    });

    it("should not duplicate an existing role", async () => {
      const owner = await createTestUser();
      const user = await createTestUser();
      const entry = await createTestEntry(owner);

      await security.addUserRight(user, entry, "write");
      await security.addUserRight(user, entry, "write");

      expect((await findRolesOfUser(entry, user)).length).to.equal(1);
    });

    it("should not grant rights on an entry sharing the same ID as the post", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const user = await createTestUser();
      const { post, entry } = await createTestPostAndEntry(postAuthor, entryOwner);

      await security.addUserRight(user, post, "write");

      const fetchedPost = await postService.findPostById(post.get("id"));
      const fetchedEntry = await entryService.findEntryById(entry.get("id"));
      expect(security.canUserWrite(user, fetchedPost)).to.be.true;
      expect(security.canUserWrite(user, fetchedEntry)).to.be.false;
      expect(security.canUserManage(postAuthor, fetchedEntry)).to.be.false;
      expect(security.canUserManage(entryOwner, fetchedPost)).to.be.false;
    });

  });

  describe("remove user right", () => {

    it("should remove a role with the exact permission", async () => {
      const owner = await createTestUser();
      const user = await createTestUser();
      const entry = await createTestEntry(owner);
      await security.addUserRight(user, entry, "write");

      await security.removeUserRight(user, entry, "write");

      expect((await findRolesOfUser(entry, user)).length).to.equal(0);
      const fetchedEntry = await entryService.findEntryById(entry.get("id"));
      expect(security.canUserWrite(user, fetchedEntry)).to.be.false;
      expect(security.canUserManage(owner, fetchedEntry)).to.be.true;
    });

    it("should do nothing if the permission does not match exactly", async () => {
      const owner = await createTestUser();
      const user = await createTestUser();
      const entry = await createTestEntry(owner);
      await security.addUserRight(user, entry, "write");

      await security.removeUserRight(user, entry, "read");

      expect((await findRolesOfUser(entry, user)).length).to.equal(1);
    });

    it("should not remove roles of a post sharing the same ID as the entry", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const user = await createTestUser();
      const { post, entry } = await createTestPostAndEntry(postAuthor, entryOwner);
      await security.addUserRight(user, post, "write");

      await security.removeUserRight(user, entry, "write");
      await security.removeUserRight(postAuthor, entry, "manage");

      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(security.canUserWrite(user, fetchedPost)).to.be.true;
      expect(security.canUserManage(postAuthor, fetchedPost)).to.be.true;
    });

  });

  async function findRolesOfUser(node: BookshelfModel, user: { id: number }): Promise<BookshelfModel[]> {
    await node.load("userRoles");
    return node.related<BookshelfCollection>("userRoles").where({ user_id: user.id }) as BookshelfModel[];
  }

});
