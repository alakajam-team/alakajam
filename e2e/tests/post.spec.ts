import { clickAndWaitForLoad, createPost, expectNotFound, loginAs, restoreDB, visit } from "../support/commands";
import {
  ADMIN_POST_WITHOUT_COMMENTS,
  ADMIN_POST_WITHOUT_COMMENTS_TITLE,
  DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN,
  DUMBLEDORE_ENTRY_SUBMISSIONS_OPEN,
  EVENT_NAME_SUBMISSIONS_OPEN,
  EVENT_TITLE_SUBMISSIONS_OPEN,
  USER_ADMINISTRATOR,
  USER_DUMBLEDORE,
  USER_GANDALF
} from "../support/data";
import PostPO from "../support/page-objects/post.po";
import { expect, test } from "../support/test";

async function commentCountersShouldContain(postPo: PostPO, value: string) {
  await expect(postPo.commentCounter).toContainText(value);
  await expect(postPo.commentSectionTitle).toContainText(value);
}

test.describe("Post", () => {

  test.beforeEach(async ({ page }) => {
    await restoreDB(page.request);
    await loginAs(page, USER_DUMBLEDORE);
  });

  test.afterAll(async ({ request }) => {
    await restoreDB(request);
  });

  test("supports creation, edition and deletion", async ({ dashboardPo, postEditPo, postPo }) => {
    await dashboardPo.posts.visit();
    await dashboardPo.posts.createPostButton.click();

    await postEditPo.titleInput.fill("I'm in");
    await postEditPo.editor.type("Let's make games!");
    await clickAndWaitForLoad(postEditPo.publishButton);

    await expect(postPo.postTitle).toContainText("I'm in");
    await expect(postPo.postBody).toContainText("Let's make games!");

    await postPo.postEditButton.click();
    await postEditPo.titleInput.fill("Hacked");
    await postEditPo.editor.clear();
    await postEditPo.editor.type("Hacked my own post");
    await clickAndWaitForLoad(postEditPo.saveButton);

    await expect(postPo.postTitle).toContainText("Hacked");
    await expect(postPo.postBody).toContainText("Hacked my own post");

    await postPo.postEditButton.click();
    await clickAndWaitForLoad(postEditPo.deleteButton);
  });

  test("supports creating, editing and deleting comments", async ({ postPo }) => {
    await postPo.visit({ postId: ADMIN_POST_WITHOUT_COMMENTS });

    await postPo.writeNewComment("Hello world!");
    await expect(postPo.comments).toContainText(["Hello world!"]);

    await postPo.commentEditButton.click();
    await postPo.commentEditor.clear();
    await postPo.commentEditor.type("Goodbye world!");
    await postPo.commentSaveButton.click();
    await expect(postPo.comments.filter({ hasText: "Hello world!" })).toHaveCount(0);
    await expect(postPo.comments).toContainText(["Goodbye world!"]);

    await postPo.commentEditButton.click();
    await postPo.commentDeleteButton.click();
    await expect(postPo.comments.filter({ hasText: "Goodbye world!" })).toHaveCount(0);
  });

  test("increments counters when creating a comment", async ({ postPo }) => {
    await postPo.visit({ postId: ADMIN_POST_WITHOUT_COMMENTS });

    await commentCountersShouldContain(postPo, "0");
    await postPo.writeNewComment("Hello world!");
    await commentCountersShouldContain(postPo, "1");
  });

  test("support liking and unliking", async ({ postPo }) => {
    await postPo.visit({ postId: ADMIN_POST_WITHOUT_COMMENTS });

    await expect(postPo.likeCounter).toContainText("0");
    await postPo.likeButton.click();
    await expect(postPo.likeCounter).toContainText("1");
    await postPo.likeButton.click();
    await expect(postPo.likeCounter).toContainText("0");
  });

  test("shows like counters on the post lists", async ({ page, postPo, homePo, userProfilePo }) => {
    await postPo.visit({ postId: ADMIN_POST_WITHOUT_COMMENTS });
    await postPo.likeButton.click();
    await expect(postPo.likeCounter).toContainText("1");

    await expect(async () => { // The home page is cached for a second
      await homePo.visit();
      await expect(homePo.postLikeCounter(ADMIN_POST_WITHOUT_COMMENTS_TITLE)).toContainText("1");
    }).toPass();
    await expect(homePo.postLikeCounter(ADMIN_POST_WITHOUT_COMMENTS_TITLE)).toHaveClass(/liked/);

    await userProfilePo.visit(USER_ADMINISTRATOR);
    await expect(userProfilePo.post(ADMIN_POST_WITHOUT_COMMENTS_TITLE).locator(".post__like-count")).toContainText("1");

    await loginAs(page, USER_GANDALF);
    await homePo.visit();
    await expect(homePo.postLikeCounter(ADMIN_POST_WITHOUT_COMMENTS_TITLE)).toContainText("1");
    await expect(homePo.postLikeCounter(ADMIN_POST_WITHOUT_COMMENTS_TITLE)).not.toHaveClass(/liked/);
  });

  test("lists posts on the related event and entry pages", async ({ page, postPo, entryPo, eventPo, userProfilePo }) => {
    const postPath = await createPost(page, {
      title: "Devlog #1",
      body: "Things are going well",
      eventTitle: EVENT_TITLE_SUBMISSIONS_OPEN
    });

    await expect(postPo.postDetails).toContainText(DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN);

    await entryPo.visit(DUMBLEDORE_ENTRY_SUBMISSIONS_OPEN);
    await expect(entryPo.relatedPostsTitles).toContainText(["Devlog #1"]);
    await entryPo.relatedPostsTitles.filter({ hasText: "Devlog #1" }).click();
    await expect(page).toHaveURL(new RegExp(postPath));

    await eventPo.visit({ eventName: EVENT_NAME_SUBMISSIONS_OPEN, page: "posts" });
    await expect(eventPo.postDetails("Devlog #1")).toContainText(DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN);

    await userProfilePo.visit(USER_DUMBLEDORE);
    await expect(userProfilePo.postsTitles).toContainText(["Devlog #1"]);
  });

  test("supports deleting a post with comments and likes", async ({ page, postPo, postEditPo, homePo, dashboardPo,
    entryPo, eventPo, userProfilePo }) => {
    const postPath = await createPost(page, {
      title: "Doomed post",
      body: "Please comment",
      eventTitle: EVENT_TITLE_SUBMISSIONS_OPEN
    });

    await loginAs(page, USER_GANDALF);
    await page.goto(postPath);
    await postPo.writeNewComment("Rest in peace");
    await expect(postPo.comments).toContainText(["Rest in peace"]);
    await postPo.likeButton.click();
    await expect(postPo.likeCounter).toContainText("1");

    await dashboardPo.feed.visit();
    await expect(dashboardPo.feed.commentsByUser).toContainText(["Rest in peace"]);

    await loginAs(page, USER_DUMBLEDORE);
    await dashboardPo.feed.visit();
    await expect(dashboardPo.feed.commentsToUser).toContainText(["Rest in peace"]);
    await expect(dashboardPo.feed.latestPostsTitles).toContainText(["Doomed post"]);

    await page.goto(postPath);
    await postPo.postEditButton.click();
    await clickAndWaitForLoad(postEditPo.deleteButton);

    await expectNotFound(page, postPath);

    await expect(async () => { // The home page is cached for a second
      await visit(page, "/");
      await expect(homePo.postTitles.first()).toBeVisible();
      await expect(homePo.postTitles.filter({ hasText: "Doomed post" })).toHaveCount(0);
    }).toPass();
    await expect(homePo.latestComments.filter({ hasText: "Rest in peace" })).toHaveCount(0);

    await visit(page, "/dashboard/feed");
    await expect(dashboardPo.feed.commentsToUser.filter({ hasText: "Rest in peace" })).toHaveCount(0);
    await expect(dashboardPo.feed.latestPostsTitles.filter({ hasText: "Doomed post" })).toHaveCount(0);

    await visit(page, "/dashboard/posts");
    await expect(dashboardPo.posts.postTitles.filter({ hasText: "Doomed post" })).toHaveCount(0);

    await visit(page, `/user/${USER_DUMBLEDORE}`);
    await expect(userProfilePo.postsTitles.filter({ hasText: "Doomed post" })).toHaveCount(0);

    await visit(page, `/${DUMBLEDORE_ENTRY_SUBMISSIONS_OPEN.eventName}/${DUMBLEDORE_ENTRY_SUBMISSIONS_OPEN.entryId}`);
    await expect(entryPo.entryTitle).toContainText(DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN);
    await expect(entryPo.relatedPostsTitles.filter({ hasText: "Doomed post" })).toHaveCount(0);

    await visit(page, `/${EVENT_NAME_SUBMISSIONS_OPEN}/posts`);
    await expect(eventPo.postsTitles.filter({ hasText: "Doomed post" })).toHaveCount(0);

    await loginAs(page, USER_GANDALF);
    await visit(page, "/dashboard/feed");
    await expect(dashboardPo.feed.commentsByUser.filter({ hasText: "Rest in peace" })).toHaveCount(0);
    await visit(page, `/user/${USER_GANDALF}`);
  });

});
