/* eslint-disable @typescript-eslint/no-unused-expressions */

import { BookshelfCollection, BookshelfModel } from "bookshelf";
import { expect } from "chai";
import { createLuxonDate } from "server/core/formats";
import * as models from "server/core/models";
import security from "server/core/security";
import { UserRole } from "server/entity/user-role.entity";
import entryService from "server/entry/entry.service";
import commentService from "server/post/comment/comment.service";
import likeService from "server/post/like/like.service";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import {
  createTestEntry,
  createTestEvent,
  createTestPost,
  createTestPostAndEntry,
  createTestUser
} from "server/testing/testing-fixtures";
import { getRepository } from "typeorm";
import { afterAll, beforeAll, describe, it, vi } from "vitest";
import postService from "./post.service";

describe("Post service", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("create post", () => {

    it("should create a post authored by the user, with a manage role", async () => {
      const user = await createTestUser();

      const post = await postService.createPost(user);

      expect(post.get("id")).to.be.ok;
      expect(post.get("author_user_id")).to.equal(user.id);

      const fetchedPost = await postService.findPostById(post.get("id"));
      const userRoles = fetchedPost.related<BookshelfCollection>("userRoles");
      expect(userRoles.length).to.equal(1);
      expect(userRoles.at(0).get("user_id")).to.equal(user.id);
      expect(userRoles.at(0).get("user_name")).to.equal(user.name);
      expect(userRoles.at(0).get("permission")).to.equal("manage");
      expect(security.canUserManage(user, fetchedPost)).to.be.true;
    });

    it("should store the event ID on the author role", async () => {
      const user = await createTestUser();
      const event = await createTestEvent();

      const post = await postService.createPost(user, event.get("id"));

      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(fetchedPost.related<BookshelfCollection>("userRoles").at(0).get("event_id")).to.equal(event.get("id"));
    });

  });

  describe("find post by ID", () => {

    it("should return the post with its author, roles, event & entry", async () => {
      const user = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(user, event);
      const post = await createTestPost(user, { entry_id: entry.get("id") }, { eventId: event.get("id") });

      const fetchedPost = await postService.findPostById(post.get("id"));

      expect(fetchedPost.get("title")).to.equal(post.get("title"));
      expect(fetchedPost.related("author").get("id")).to.equal(user.id);
      expect(fetchedPost.related<BookshelfCollection>("userRoles").length).to.equal(1);
      expect(fetchedPost.related("event").get("id")).to.equal(event.get("id"));
      expect(fetchedPost.related("entry").get("id")).to.equal(entry.get("id"));
      const entryRoles = fetchedPost.related<BookshelfModel>("entry").related<BookshelfCollection>("userRoles");
      expect(entryRoles.length).to.equal(1);
      expect(entryRoles.at(0).get("user_id")).to.equal(user.id);
    });

    it("should return nothing for an unknown ID", async () => {
      const fetchedPost = await postService.findPostById(999999);
      expect(fetchedPost).to.not.be.ok;
    });

    it("should not load roles of an entry sharing the same ID", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const { post, entry } = await createTestPostAndEntry(postAuthor, entryOwner);

      const fetchedPost = await postService.findPostById(post.get("id"));
      const roleUserIds = fetchedPost.related<BookshelfCollection>("userRoles").map((role) => role.get("user_id"));
      expect(roleUserIds).to.deep.equal([postAuthor.id]);

      const fetchedEntry = await entryService.findEntryById(entry.get("id"));
      const entryRoleUserIds = fetchedEntry.related<BookshelfCollection>("userRoles").map((role) => role.get("user_id"));
      expect(entryRoleUserIds).to.deep.equal([entryOwner.id]);

      expect(security.canUserWrite(entryOwner, fetchedPost)).to.be.false;
      expect(security.canUserWrite(postAuthor, fetchedEntry)).to.be.false;
    });

  });

  describe("find posts", () => {

    it("should only find posts on which the user has write permissions or above", async () => {
      const author = await createTestUser();
      const writer = await createTestUser();
      const watcher = await createTestUser();
      const post = await createTestPost(author);
      await security.addUserRight(writer, post, "write");
      await security.addUserRight(watcher, post, "watch");

      expect(await findPostIds({ userId: author.id })).to.deep.equal([post.get("id")]);
      expect(await findPostIds({ userId: writer.id })).to.deep.equal([post.get("id")]);
      expect(await findPostIds({ userId: watcher.id })).to.deep.equal([]);
    });

    it("should not find posts through roles on an entry sharing the same ID", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const { post } = await createTestPostAndEntry(postAuthor, entryOwner);

      expect(await findPostIds({ userId: postAuthor.id })).to.deep.equal([post.get("id")]);
      expect(await findPostIds({ userId: entryOwner.id })).to.deep.equal([]);
    });

    it("should exclude drafts unless allowed", async () => {
      const author = await createTestUser();
      const draft = await createTestPost(author, { published_at: null });
      const future = await createTestPost(author, { published_at: createLuxonDate().plus({ days: 1 }).toJSDate() });
      const published = await createTestPost(author);

      expect(await findPostIds({ userId: author.id })).to.deep.equal([published.get("id")]);
      expect((await findPostIds({ userId: author.id, allowDrafts: true })).sort())
        .to.deep.equal([draft.get("id"), future.get("id"), published.get("id")].sort());
    });

    it("should filter by event and entry", async () => {
      const author = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(author, event);
      const eventPost = await createTestPost(author, {}, { eventId: event.get("id") });
      const entryPost = await createTestPost(author, { entry_id: entry.get("id") });
      await createTestPost(author);

      expect(await findPostIds({ eventId: event.get("id") })).to.deep.equal([eventPost.get("id")]);
      expect(await findPostIds({ entryId: entry.get("id") })).to.deep.equal([entryPost.get("id")]);
    });

    it("should load user roles of the found posts", async () => {
      const author = await createTestUser();
      await createTestPost(author);

      const posts = await postService.findPosts({ userId: author.id });
      expect(posts.length).to.equal(1);
      const roles = posts.at(0).related<BookshelfCollection>("userRoles");
      expect(roles.map((role) => role.get("user_id"))).to.deep.equal([author.id]);
    });

  });

  describe("refresh comment count", () => {

    it("should count the comments of a post", async () => {
      const author = await createTestUser();
      const commenter = await createTestUser();
      const post = await createTestPost(author);
      await commentService.createComment(commenter, post, "First");
      await commentService.createComment(author, post, "Second");

      await postService.refreshCommentCount(post);

      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(fetchedPost.get("comment_count")).to.equal(2);
    });

    it("should count the comments of an entry", async () => {
      const owner = await createTestUser();
      const entry = await createTestEntry(owner);
      await commentService.createComment(owner, entry, "First");

      await postService.refreshCommentCount(entry);

      const fetchedEntry = await entryService.findEntryById(entry.get("id"));
      expect(fetchedEntry.get("comment_count")).to.equal(1);
    });

    it("should not count comments of an entry sharing the same ID", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const { post, entry } = await createTestPostAndEntry(postAuthor, entryOwner);
      await commentService.createComment(entryOwner, entry, "Entry comment 1");
      await commentService.createComment(entryOwner, entry, "Entry comment 2");
      await commentService.createComment(postAuthor, post, "Post comment");

      await postService.refreshCommentCount(post);
      await postService.refreshCommentCount(entry);

      expect((await postService.findPostById(post.get("id"))).get("comment_count")).to.equal(1);
      expect((await entryService.findEntryById(entry.get("id"))).get("comment_count")).to.equal(2);
    });

  });

  describe("delete post", () => {

    it("should delete the post along with its roles, comments and likes", async () => {
      const author = await createTestUser();
      const commenter = await createTestUser();
      const post = await createTestPost(author);
      await security.addUserRight(commenter, post, "watch");
      const comment = await commentService.createComment(commenter, post, "Nice post");
      await likeService.like(post, commenter.id, "like");
      const postId = post.get("id");

      await postService.deletePost(post);

      expect(await postService.findPostById(postId)).to.not.be.ok;
      // Roles & comments are deleted asynchronously
      await vi.waitFor(async () => {
        expect(await countUserRoles(author.id)).to.equal(0);
        expect(await countUserRoles(commenter.id)).to.equal(0);
        expect(await commentService.findCommentById(comment.get("id"))).to.not.be.ok;
      });
      expect(await countLikesByUser(commenter.id)).to.equal(0);
    });

    it("should leave other posts and entries untouched", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const { post, entry } = await createTestPostAndEntry(postAuthor, entryOwner);
      const otherPost = await createTestPost(postAuthor);
      await commentService.createComment(postAuthor, post, "Comment on deleted post");
      const otherPostComment = await commentService.createComment(entryOwner, otherPost, "Comment on other post");
      const entryComment = await commentService.createComment(postAuthor, entry, "Comment on entry");
      await likeService.like(otherPost, entryOwner.id, "like");

      await postService.deletePost(post);

      await vi.waitFor(async () => {
        expect(await findPostIds({ userId: postAuthor.id })).to.deep.equal([otherPost.get("id")]);
      });
      expect(await commentService.findCommentById(otherPostComment.get("id"))).to.be.ok;
      expect(await commentService.findCommentById(entryComment.get("id"))).to.be.ok;
      expect(await likeService.findLike(otherPost, entryOwner.id)).to.be.ok;

      const fetchedEntry = await entryService.findEntryById(entry.get("id"));
      expect(fetchedEntry).to.be.ok;
      expect(fetchedEntry.related<BookshelfCollection>("userRoles").map((role) => role.get("user_id")))
        .to.deep.equal([entryOwner.id]);
      expect(security.canUserManage(entryOwner, fetchedEntry)).to.be.true;
    });

  });

  describe("attach posts to entry", () => {

    it("should attach the user's posts from the same event to the entry", async () => {
      const user = await createTestUser();
      const event = await createTestEvent();
      const otherEvent = await createTestEvent();
      const eventPost = await createTestPost(user, {}, { eventId: event.get("id") });
      const otherEventPost = await createTestPost(user, {}, { eventId: otherEvent.get("id") });
      const otherUser = await createTestUser();
      const otherUserPost = await createTestPost(otherUser, {}, { eventId: event.get("id") });
      const entry = await createTestEntry(otherUser); // External entry, so the posts are not attached automatically

      await postService.attachPostsToEntry(event.get("id"), user.id, entry.get("id"));

      expect((await postService.findPostById(eventPost.get("id"))).get("entry_id")).to.equal(entry.get("id"));
      expect((await postService.findPostById(otherEventPost.get("id"))).get("entry_id")).to.not.be.ok;
      expect((await postService.findPostById(otherUserPost.get("id"))).get("entry_id")).to.not.be.ok;
    });

    it("should be triggered when creating an entry for an event", async () => {
      const user = await createTestUser();
      const event = await createTestEvent();
      const post = await createTestPost(user, {}, { eventId: event.get("id") });

      const entry = await createTestEntry(user, event);

      expect((await postService.findPostById(post.get("id"))).get("entry_id")).to.equal(entry.get("id"));
    });

    it("should not attach posts when the user only has a role on an entry sharing the same ID", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const event = await createTestEvent();
      const { post } = await createTestPostAndEntry(postAuthor, entryOwner);
      post.set("event_id", event.get("id"));
      await post.save();
      const targetEntry = await createTestEntry(postAuthor);

      await postService.attachPostsToEntry(event.get("id"), entryOwner.id, targetEntry.get("id"));

      expect((await postService.findPostById(post.get("id"))).get("entry_id")).to.not.be.ok;
    });

  });

  async function findPostIds(options: Parameters<typeof postService.findPosts>[0]): Promise<number[]> {
    const posts = await postService.findPosts(options);
    return posts.map((post) => post.get("id"));
  }

  function countUserRoles(userId: number): Promise<number> {
    return getRepository(UserRole).count({ where: { user_id: userId } });
  }

  async function countLikesByUser(userId: number): Promise<number> {
    const count = await models.Like.where({ user_id: userId }).count();
    return parseInt(count.toString(), 10);
  }

});
