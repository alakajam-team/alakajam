/* eslint-disable @typescript-eslint/no-unused-expressions */

import { expect } from "chai";
import * as models from "server/core/models";
import postService from "server/post/post.service";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import { createTestPost, createTestUser } from "server/testing/testing-fixtures";
import { afterAll, beforeAll, describe, it } from "vitest";
import likeService from "./like.service";

describe("Like service", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("like types", () => {

    it("should validate like types", () => {
      expect(likeService.isValidLikeType("like")).to.be.true;
      expect(likeService.isValidLikeType("dislike")).to.be.false;
    });

  });

  describe("like", () => {

    it("should like a post and update its counters", async () => {
      const author = await createTestUser();
      const liker = await createTestUser();
      const post = await createTestPost(author);

      const like = await likeService.like(post, liker.id, "like");

      expect(like.get("user_id")).to.equal(liker.id);
      expect(like.get("type")).to.equal("like");
      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(fetchedPost.get("like_count")).to.equal(1);
      expect(fetchedPost.get("like_details")).to.deep.equal({ like: 1 });
      const foundLike = await likeService.findLike(post, liker.id);
      expect(foundLike.get("id")).to.equal(like.get("id"));
    });

    it("should count likes from several users", async () => {
      const author = await createTestUser();
      const liker1 = await createTestUser();
      const liker2 = await createTestUser();
      const post = await createTestPost(author);

      await likeService.like(post, liker1.id, "like");
      await likeService.like(post, liker2.id, "like");

      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(fetchedPost.get("like_count")).to.equal(2);
      expect(fetchedPost.get("like_details")).to.deep.equal({ like: 2 });
    });

    it("should not like twice", async () => {
      const author = await createTestUser();
      const liker = await createTestUser();
      const post = await createTestPost(author);

      await likeService.like(post, liker.id, "like");
      await likeService.like(post, liker.id, "like");

      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(fetchedPost.get("like_count")).to.equal(1);
      expect(fetchedPost.get("like_details")).to.deep.equal({ like: 1 });
    });

    it("should ignore invalid like types", async () => {
      const author = await createTestUser();
      const liker = await createTestUser();
      const post = await createTestPost(author);

      const like = await likeService.like(post, liker.id, "invalid");

      expect(like).to.not.be.ok;
      expect(await likeService.findLike(post, liker.id)).to.not.be.ok;
    });

    it("should not mix up likes of different posts", async () => {
      const author = await createTestUser();
      const liker = await createTestUser();
      const likedPost = await createTestPost(author);
      const otherPost = await createTestPost(author);

      await likeService.like(likedPost, liker.id, "like");

      expect(await likeService.findLike(otherPost, liker.id)).to.not.be.ok;
      expect((await postService.findPostById(otherPost.get("id"))).get("like_count")).to.not.be.ok;
    });

  });

  describe("unlike", () => {

    it("should remove the like and update counters", async () => {
      const author = await createTestUser();
      const liker1 = await createTestUser();
      const liker2 = await createTestUser();
      const post = await createTestPost(author);
      await likeService.like(post, liker1.id, "like");
      await likeService.like(post, liker2.id, "like");

      await likeService.unlike(post, liker1.id);

      expect(await likeService.findLike(post, liker1.id)).to.not.be.ok;
      expect(await likeService.findLike(post, liker2.id)).to.be.ok;
      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(fetchedPost.get("like_count")).to.equal(1);
      expect(fetchedPost.get("like_details")).to.deep.equal({ like: 1 });
    });

    it("should clear like details when the last like is removed", async () => {
      const author = await createTestUser();
      const liker = await createTestUser();
      const post = await createTestPost(author);
      await likeService.like(post, liker.id, "like");

      await likeService.unlike(post, liker.id);

      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(fetchedPost.get("like_count")).to.equal(0);
      expect(fetchedPost.get("like_details")).to.deep.equal({});
    });

    it("should do nothing if the post was not liked", async () => {
      const author = await createTestUser();
      const liker = await createTestUser();
      const post = await createTestPost(author);

      await likeService.unlike(post, liker.id);

      expect(await likeService.findLike(post, liker.id)).to.not.be.ok;
    });

  });

  describe("find user like info", () => {

    it("should map liked post IDs to like types", async () => {
      const author = await createTestUser();
      const liker = await createTestUser();
      const likedPost = await createTestPost(author);
      const notLikedPost = await createTestPost(author);
      await likeService.like(likedPost, liker.id, "like");

      const likeInfo = await likeService.findUserLikeInfo([likedPost, undefined, notLikedPost], liker);

      expect(likeInfo).to.deep.equal({ [likedPost.get("id")]: "like" });
    });

    it("should be empty without user or nodes", async () => {
      const author = await createTestUser();
      const post = await createTestPost(author);

      expect(await likeService.findUserLikeInfo([post], undefined)).to.deep.equal({});
      expect(await likeService.findUserLikeInfo([], author)).to.deep.equal({});
    });

    it("should only return likes of the given user", async () => {
      const author = await createTestUser();
      const liker = await createTestUser();
      const post = await createTestPost(author);
      await likeService.like(post, liker.id, "like");

      expect(await likeService.findUserLikeInfo([post], author)).to.deep.equal({});
    });

  });

  describe("post deletion", () => {

    it("should delete the likes of the post", async () => {
      const author = await createTestUser();
      const liker = await createTestUser();
      const post = await createTestPost(author);
      const otherPost = await createTestPost(author);
      await likeService.like(post, liker.id, "like");
      await likeService.like(otherPost, liker.id, "like");

      await postService.deletePost(post);

      const remainingLikes = await models.Like.where({ user_id: liker.id }).fetchAll();
      expect(remainingLikes.map((like) => like.get("node_id"))).to.deep.equal([otherPost.get("id")]);
      expect(await likeService.findLike(otherPost, liker.id)).to.be.ok;
    });

  });

});
