/* eslint-disable @typescript-eslint/no-unused-expressions */

import { BookshelfModel, CommentBookshelfModel } from "bookshelf";
import { expect } from "chai";
import constants from "server/core/constants";
import { createLuxonDate } from "server/core/formats";
import security from "server/core/security";
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
import commentService from "./comment.service";

describe("Comment service", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("create comment", () => {

    it("should comment a post", async () => {
      const author = await createTestUser();
      const commenter = await createTestUser();
      const post = await createTestPost(author);

      const comment = await commentService.createComment(commenter, post, "Hello post");

      const fetchedComment = await commentService.findCommentById(comment.get("id"));
      expect(fetchedComment.get("body")).to.equal("Hello post");
      expect(fetchedComment.get("user_id")).to.equal(commenter.id);
      expect(fetchedComment.related("user").get("name")).to.equal(commenter.name);
      expect(await findCommentBodiesOnNode(post)).to.deep.equal(["Hello post"]);
    });

    it("should comment an entry", async () => {
      const owner = await createTestUser();
      const commenter = await createTestUser();
      const entry = await createTestEntry(owner);

      await commentService.createComment(commenter, entry, "Hello entry");

      expect(await findCommentBodiesOnNode(entry)).to.deep.equal(["Hello entry"]);
    });

    it("should sort comments of a node by creation date", async () => {
      const owner = await createTestUser();
      const entry = await createTestEntry(owner);
      await commentService.createComment(owner, entry, "First");
      await commentService.createComment(owner, entry, "Second");
      await commentService.createComment(owner, entry, "Third");

      expect(await findCommentBodiesOnNode(entry)).to.deep.equal(["First", "Second", "Third"]);
    });

    it("should keep comments of a post and an entry sharing the same ID separate", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const { post, entry } = await createTestPostAndEntry(postAuthor, entryOwner);

      const postComment = await commentService.createComment(entryOwner, post, "On post");
      const entryComment = await commentService.createComment(postAuthor, entry, "On entry");

      expect(await findCommentBodiesOnNode(post)).to.deep.equal(["On post"]);
      expect(await findCommentBodiesOnNode(entry)).to.deep.equal(["On entry"]);

      // The comment node relation resolves to the right model
      const commentsByEntryOwner = await commentService.findCommentsByUser(entryOwner);
      expect(commentsByEntryOwner.length).to.equal(1);
      expect(commentsByEntryOwner.at(0).get("id")).to.equal(postComment.get("id"));
      expect((commentsByEntryOwner.at(0) as CommentBookshelfModel).node().nodeType()).to.equal("post");
      expect((commentsByEntryOwner.at(0) as CommentBookshelfModel).node().get("title")).to.equal(post.get("title"));

      const commentsByPostAuthor = await commentService.findCommentsByUser(postAuthor);
      expect(commentsByPostAuthor.length).to.equal(1);
      expect(commentsByPostAuthor.at(0).get("id")).to.equal(entryComment.get("id"));
      expect((commentsByPostAuthor.at(0) as CommentBookshelfModel).node().nodeType()).to.equal("entry");
      expect((commentsByPostAuthor.at(0) as CommentBookshelfModel).node().get("title")).to.equal(entry.get("title"));
    });

  });

  describe("edit comment", () => {

    it("should update the comment body", async () => {
      const owner = await createTestUser();
      const entry = await createTestEntry(owner);
      const comment = await commentService.createComment(owner, entry, "Original");

      comment.set("body", "Edited");
      await comment.save();

      const fetchedComment = await commentService.findCommentById(comment.get("id"));
      expect(fetchedComment.get("body")).to.equal("Edited");
      expect(await findCommentBodiesOnNode(entry)).to.deep.equal(["Edited"]);
    });

    it("should only allow the comment author to edit it", async () => {
      const author = await createTestUser();
      const commenter = await createTestUser();
      const post = await createTestPost(author);
      const comment = await commentService.createComment(commenter, post, "Comment");

      const fetchedComment = await commentService.findCommentById(comment.get("id"));
      expect(security.canUserWrite(commenter, fetchedComment)).to.be.true;
      expect(security.canUserWrite(author, fetchedComment)).to.be.false;
    });

  });

  describe("delete comment", () => {

    it("should delete a post comment", async () => {
      const author = await createTestUser();
      const post = await createTestPost(author);
      const comment = await commentService.createComment(author, post, "To delete");
      const kept = await commentService.createComment(author, post, "To keep");
      const commentId = comment.get("id");

      await commentService.deleteComment(comment);

      expect(await commentService.findCommentById(commentId)).to.not.be.ok;
      expect(await commentService.findCommentById(kept.get("id"))).to.be.ok;
      expect(await findCommentBodiesOnNode(post)).to.deep.equal(["To keep"]);
    });

    it("should delete an anonymous entry comment along with its author link", async () => {
      const owner = await createTestUser();
      const commenter = await createTestUser();
      const entry = await createTestEntry(owner, undefined, { allow_anonymous: true });
      const comment = await commentService.createComment(commenter, entry, "Anonymous", true);
      expect(await commentService.findOwnAnonymousCommentIds(commenter, entry.get("id")))
        .to.deep.equal([comment.get("id")]);

      await commentService.deleteComment(comment);

      expect(await findCommentBodiesOnNode(entry)).to.deep.equal([]);
      expect(await commentService.findOwnAnonymousCommentIds(commenter, entry.get("id"))).to.deep.equal([]);
    });

  });

  describe("anonymous comments", () => {

    it("should create anonymous comments on entries allowing them", async () => {
      const owner = await createTestUser();
      const commenter = await createTestUser();
      const entry = await createTestEntry(owner, undefined, { allow_anonymous: true });

      const comment = await commentService.createComment(commenter, entry, "Anonymous", true);

      const fetchedComment = await commentService.findCommentById(comment.get("id"));
      expect(fetchedComment.get("user_id")).to.equal(constants.ANONYMOUS_USER_ID);
      expect(await commentService.findOwnAnonymousCommentIds(commenter, entry.get("id")))
        .to.deep.equal([comment.get("id")]);
      expect(await commentService.findOwnAnonymousCommentIds(owner, entry.get("id"))).to.deep.equal([]);
    });

    it("should not create anonymous comments on entries disallowing them", async () => {
      const owner = await createTestUser();
      const commenter = await createTestUser();
      const entry = await createTestEntry(owner);

      const comment = await commentService.createComment(commenter, entry, "Not anonymous", true);

      expect(comment.get("user_id")).to.equal(commenter.id);
      expect(await commentService.findOwnAnonymousCommentIds(commenter, entry.get("id"))).to.deep.equal([]);
    });

    it("should not create anonymous comments for users disallowed to", async () => {
      const owner = await createTestUser();
      const commenter = await createTestUser({ disallow_anonymous: true });
      const entry = await createTestEntry(owner, undefined, { allow_anonymous: true });

      const comment = await commentService.createComment(commenter, entry, "Not anonymous", true);

      expect(comment.get("user_id")).to.equal(commenter.id);
    });

    it("should not create anonymous comments on posts", async () => {
      const author = await createTestUser();
      const commenter = await createTestUser();
      const post = await createTestPost(author);

      const comment = await commentService.createComment(commenter, post, "Not anonymous", true);

      expect(comment.get("user_id")).to.equal(commenter.id);
    });

    it("should only find own anonymous comments of the requested node", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const commenter = await createTestUser();
      const { post, entry } = await createTestPostAndEntry(postAuthor, entryOwner);
      await entry.save({ allow_anonymous: true }, { patch: true });
      const otherEntry = await createTestEntry(entryOwner, undefined, { allow_anonymous: true });
      const comment = await commentService.createComment(commenter, entry, "Anonymous", true);
      await commentService.createComment(commenter, otherEntry, "Anonymous elsewhere", true);
      await commentService.createComment(commenter, post, "On post", true);

      expect(await commentService.findOwnAnonymousCommentIds(commenter, entry.get("id")))
        .to.deep.equal([comment.get("id")]);
      expect(await commentService.findOwnAnonymousCommentIds(commenter, post.get("id"))).to.deep.equal([]);
    });

    it("should tell that a regular comment is not an own anonymous comment", async () => {
      const owner = await createTestUser();
      const entry = await createTestEntry(owner);
      const comment = await commentService.createComment(owner, entry, "Regular");

      expect(await commentService.isOwnAnonymousComment(comment, owner)).to.be.false;
    });

    it("should tell that an anonymous comment belongs to its author", async () => {
      const owner = await createTestUser();
      const commenter = await createTestUser();
      const entry = await createTestEntry(owner, undefined, { allow_anonymous: true });
      const comment = await commentService.createComment(commenter, entry, "Anonymous", true);

      expect(await commentService.isOwnAnonymousComment(comment, commenter)).to.be.true;
      expect(await commentService.isOwnAnonymousComment(comment, owner)).to.be.false;
    });

  });

  describe("find comments by user", () => {

    it("should find all comments of a user on posts and entries, latest first", async () => {
      const author = await createTestUser();
      const commenter = await createTestUser();
      const post = await createTestPost(author);
      const entry = await createTestEntry(author);
      await commentService.createComment(commenter, post, "On post");
      await commentService.createComment(commenter, entry, "On entry");
      await commentService.createComment(author, entry, "By author");

      const comments = await commentService.findCommentsByUser(commenter);
      expect(comments.map((c) => c.get("body")).sort()).to.deep.equal(["On entry", "On post"]);
      for (const comment of comments.models) {
        expect((comment as CommentBookshelfModel).node().get("id")).to.be.ok;
      }
    });

    it("should find comments of a user on entries of an event", async () => {
      const commenter = await createTestUser();
      const owner = await createTestUser();
      const event = await createTestEvent();
      const otherEvent = await createTestEvent();
      const entry = await createTestEntry(owner, event);
      const otherEventEntry = await createTestEntry(owner, otherEvent);
      const eventPost = await createTestPost(owner, {}, { eventId: event.get("id") });
      const comment = await commentService.createComment(commenter, entry, "On entry");
      await commentService.createComment(commenter, otherEventEntry, "On other event entry");
      await commentService.createComment(commenter, eventPost, "On event post");
      await commentService.createComment(owner, entry, "By owner");

      const comments = await commentService.findCommentsByUserAndEvent(commenter.id, event.get("id"));
      expect(comments.map((c) => c.get("id"))).to.deep.equal([comment.get("id")]);
      expect(comments.at(0).get("node_id")).to.equal(entry.get("id"));
    });

    it("should not find event comments made on a post sharing the ID of an event entry", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const commenter = await createTestUser();
      const event = await createTestEvent();
      const { post, entry } = await createTestPostAndEntry(postAuthor, entryOwner);
      await entry.save({ event_id: event.get("id") }, { patch: true });
      await commentService.createComment(commenter, post, "On post");

      const comments = await commentService.findCommentsByUserAndEvent(commenter.id, event.get("id"));
      expect(comments.length).to.equal(0);
    });

  });

  describe("find comments to user", () => {

    it("should find comments made by others on the user's posts and entries", async () => {
      const owner = await createTestUser();
      const commenter = await createTestUser();
      const post = await createTestPost(owner);
      const entry = await createTestEntry(owner);
      await waitMs(5);
      await commentService.createComment(commenter, post, "On post");
      await commentService.createComment(commenter, entry, "On entry");
      await commentService.createComment(owner, entry, "Own comment");

      const comments = await commentService.findCommentsToUser(owner);
      expect(comments.map((c) => c.get("body")).sort()).to.deep.equal(["On entry", "On post"]);
    });

    it("should find comments on nodes where the user has any role", async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const commenter = await createTestUser();
      const entry = await createTestEntry(owner);
      await security.addUserRight(member, entry, "write");
      // Make sure the comment is more recent than the role
      await waitMs(5);
      await commentService.createComment(commenter, entry, "On team entry");

      const comments = await commentService.findCommentsToUser(member);
      expect(comments.map((c) => c.get("body"))).to.deep.equal(["On team entry"]);
    });

    it("should find comments mentioning the user", async () => {
      const mentioned = await createTestUser({ name: "mentionme" });
      const commenter = await createTestUser();
      const entry = await createTestEntry(commenter);
      await commentService.createComment(commenter, entry, "Hello @mentionme!");
      await commentService.createComment(commenter, entry, "Hello nobody");

      const comments = await commentService.findCommentsToUser(mentioned);
      expect(comments.map((c) => c.get("body"))).to.deep.equal(["Hello @mentionme!"]);
    });

    it("should not find comments on an entry sharing the ID of the user's post", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const commenter = await createTestUser();
      const { post, entry } = await createTestPostAndEntry(postAuthor, entryOwner);
      await waitMs(5);
      await commentService.createComment(commenter, entry, "On entry");
      await commentService.createComment(commenter, post, "On post");

      const postAuthorComments = await commentService.findCommentsToUser(postAuthor);
      expect(postAuthorComments.map((c) => c.get("body"))).to.deep.equal(["On post"]);
      expect((postAuthorComments.at(0) as CommentBookshelfModel).node().nodeType()).to.equal("post");

      const entryOwnerComments = await commentService.findCommentsToUser(entryOwner);
      expect(entryOwnerComments.map((c) => c.get("body"))).to.deep.equal(["On entry"]);
      expect((entryOwnerComments.at(0) as CommentBookshelfModel).node().nodeType()).to.equal("entry");
    });

  });

  describe("find latest comments", () => {

    it("should only return comments on nodes readable by anonymous users", async () => {
      const approvedAuthor = await createTestUser({ approbation_state: "approved" });
      const publishedPost = await createTestPost(approvedAuthor);
      const draftPost = await createTestPost(approvedAuthor, { published_at: null });
      const publishedEntry = await createTestEntry(approvedAuthor, undefined, {
        published_at: createLuxonDate().minus({ hours: 1 }).toJSDate()
      });
      const visibleOnPost = await commentService.createComment(approvedAuthor, publishedPost, "Visible on post");
      const hiddenOnDraft = await commentService.createComment(approvedAuthor, draftPost, "Hidden on draft");
      const visibleOnEntry = await commentService.createComment(approvedAuthor, publishedEntry, "Visible on entry");

      const comments = await commentService.findLatestComments({ limit: 1000 });

      const commentIds = comments.map((c) => c.get("id"));
      expect(commentIds).to.include(visibleOnPost.get("id"));
      expect(commentIds).to.include(visibleOnEntry.get("id"));
      expect(commentIds).to.not.include(hiddenOnDraft.get("id"));
    });

  });

  describe("comment count", () => {

    it("should be refreshable after creating and deleting comments", async () => {
      const owner = await createTestUser();
      const post = await createTestPost(owner);
      const comment = await commentService.createComment(owner, post, "One");
      await commentService.createComment(owner, post, "Two");
      await postService.refreshCommentCount(post);
      expect((await postService.findPostById(post.get("id"))).get("comment_count")).to.equal(2);

      await commentService.deleteComment(comment);
      await postService.refreshCommentCount(post);
      expect((await postService.findPostById(post.get("id"))).get("comment_count")).to.equal(1);
    });

  });

  async function findCommentBodiesOnNode(node: BookshelfModel): Promise<string[]> {
    const comments = await commentService.findCommentsOnNodeForDisplay(node as any);
    return comments.map((comment) => comment.get("body"));
  }

  function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

});
