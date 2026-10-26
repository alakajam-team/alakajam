import { createPost, loginAs, restoreDB } from "../support/commands";
import {
  ADMIN_POST_WITH_COMMENTS,
  ADMIN_POST_WITH_COMMENTS_COMMENT,
  ADMIN_POST_WITH_COMMENTS_TITLE,
  DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN,
  DUMBLEDORE_ENTRY_SUBMISSIONS_OPEN,
  USER_ADMINISTRATOR,
  USER_DUMBLEDORE,
  USER_GANDALF,
  USER_YODA,
  YODA_ENTRY_WITH_COMMENTS,
  YODA_ENTRY_WITH_COMMENTS_COMMENT,
  YODA_ENTRY_WITH_COMMENTS_TITLE
} from "../support/data";
import { expect, test } from "../support/test";

const POST_URL_PATTERN = (postId: number) => new RegExp(`^/post/${postId}/`);
const ENTRY_URL_PATTERN = ({ eventName, entryId }: { eventName: string; entryId: number }) =>
  new RegExp(`^/${eventName}/${entryId}/`);

test.describe("Dashboard: comment feed", () => {

  test.beforeEach(async ({ page }) => {
    await restoreDB(page.request);
  });

  test.afterAll(async ({ request }) => {
    await restoreDB(request);
  });

  test("lists comments on posts, with links", async ({ page, dashboardPo, postPo }) => {
    await loginAs(page, USER_DUMBLEDORE);
    await dashboardPo.feed.visit();
    await expect(dashboardPo.feed.commentsByUser).toContainText([ADMIN_POST_WITH_COMMENTS_COMMENT]);
    const byUserLink = dashboardPo.feed.commentsByUserNodeLinks.filter({ hasText: ADMIN_POST_WITH_COMMENTS_TITLE });
    await expect(byUserLink).toHaveAttribute("href", POST_URL_PATTERN(ADMIN_POST_WITH_COMMENTS));

    await loginAs(page, USER_ADMINISTRATOR);
    await dashboardPo.feed.visit();
    await expect(dashboardPo.feed.commentsToUser).toContainText([ADMIN_POST_WITH_COMMENTS_COMMENT]);
    const toUserLink = dashboardPo.feed.commentsToUserNodeLinks.filter({ hasText: ADMIN_POST_WITH_COMMENTS_TITLE });
    await expect(toUserLink).toHaveAttribute("href", POST_URL_PATTERN(ADMIN_POST_WITH_COMMENTS));

    await toUserLink.click();
    await expect(postPo.postTitle).toContainText(ADMIN_POST_WITH_COMMENTS_TITLE);
    await expect(postPo.comments).toContainText([ADMIN_POST_WITH_COMMENTS_COMMENT]);
  });

  test("lists comments on entries, with links", async ({ page, dashboardPo, entryPo }) => {
    await loginAs(page, USER_ADMINISTRATOR);
    await dashboardPo.feed.visit();
    await expect(dashboardPo.feed.commentsByUser).toContainText([YODA_ENTRY_WITH_COMMENTS_COMMENT]);
    const byUserLink = dashboardPo.feed.commentsByUserNodeLinks.filter({ hasText: YODA_ENTRY_WITH_COMMENTS_TITLE });
    await expect(byUserLink).toHaveAttribute("href", ENTRY_URL_PATTERN(YODA_ENTRY_WITH_COMMENTS));

    await dashboardPo.feed.visit({ asUser: USER_YODA }); // Admin mode
    await expect(dashboardPo.feed.commentsToUser).toContainText([YODA_ENTRY_WITH_COMMENTS_COMMENT]);
    const toUserLink = dashboardPo.feed.commentsToUserNodeLinks.filter({ hasText: YODA_ENTRY_WITH_COMMENTS_TITLE });
    await expect(toUserLink).toHaveAttribute("href", ENTRY_URL_PATTERN(YODA_ENTRY_WITH_COMMENTS));

    await toUserLink.click();
    await expect(entryPo.entryTitle).toContainText(YODA_ENTRY_WITH_COMMENTS_TITLE);
    await expect(entryPo.comments).toContainText([YODA_ENTRY_WITH_COMMENTS_COMMENT]);
  });

  test("notifies only the owners of the commented post or entry", async ({ page, dashboardPo, postPo, entryPo }) => {
    await loginAs(page, USER_GANDALF);
    const postPath = await createPost(page, { title: "Gandalf's thoughts", body: "You shall not pass" });

    await loginAs(page, USER_ADMINISTRATOR);
    await page.goto(postPath);
    await postPo.writeNewComment("Comment on the post");
    await expect(postPo.comments).toContainText(["Comment on the post"]);
    await entryPo.visit(DUMBLEDORE_ENTRY_SUBMISSIONS_OPEN);
    await entryPo.writeNewComment("Comment on the entry");
    await expect(entryPo.comments).toContainText(["Comment on the entry"]);

    await dashboardPo.feed.visit();
    await expect(dashboardPo.feed.commentsByUserNodeLinks.filter({ hasText: "Gandalf's thoughts" }))
      .toHaveAttribute("href", new RegExp(`^${postPath}`));
    await expect(dashboardPo.feed.commentsByUserNodeLinks.filter({ hasText: DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN }))
      .toHaveAttribute("href", ENTRY_URL_PATTERN(DUMBLEDORE_ENTRY_SUBMISSIONS_OPEN));

    await loginAs(page, USER_GANDALF);
    await dashboardPo.feed.visit();
    await expect(dashboardPo.feed.commentsToUser).toContainText(["Comment on the post"]);
    await expect(dashboardPo.feed.commentsToUser.filter({ hasText: "Comment on the entry" })).toHaveCount(0);

    await loginAs(page, USER_DUMBLEDORE);
    await dashboardPo.feed.visit();
    await expect(dashboardPo.feed.commentsToUser).toContainText(["Comment on the entry"]);
    await expect(dashboardPo.feed.commentsToUser.filter({ hasText: "Comment on the post" })).toHaveCount(0);
  });

});
