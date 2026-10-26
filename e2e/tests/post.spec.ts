import { clickAndWaitForLoad, loginAs, restoreDB } from "../support/commands";
import { ADMIN_POST_WITHOUT_COMMENTS, USER_DUMBLEDORE } from "../support/data";
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

});
