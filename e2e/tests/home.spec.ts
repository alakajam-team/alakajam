import { clickAndWaitForLoad, loginAs, logout, restoreDB } from "../support/commands";
import {
  ADMIN_POST_WITHOUT_COMMENTS,
  ADMIN_POST_WITHOUT_COMMENTS_TITLE,
  ADMIN_POST_WITH_COMMENTS,
  ADMIN_POST_WITH_COMMENTS_COMMENT,
  ADMIN_POST_WITH_COMMENTS_TITLE,
  USER_ADMINISTRATOR,
  YODA_ENTRY_WITH_COMMENTS,
  YODA_ENTRY_WITH_COMMENTS_COMMENT,
  YODA_ENTRY_WITH_COMMENTS_TITLE
} from "../support/data";
import { expect, test } from "../support/test";

test.describe("Home page", () => {

  test.beforeEach(async ({ page }) => {
    await restoreDB(page.request);
  });

  test.afterAll(async ({ request }) => {
    await restoreDB(request);
  });

  test("lists the latest comments on posts and entries, with links", async ({ homePo, postPo }) => {
    await homePo.visit();

    await expect(homePo.latestComments).toContainText([YODA_ENTRY_WITH_COMMENTS_COMMENT, ADMIN_POST_WITH_COMMENTS_COMMENT]);

    const entryLink = homePo.latestCommentsNodeLinks.filter({ hasText: YODA_ENTRY_WITH_COMMENTS_TITLE });
    await expect(entryLink).toHaveAttribute("href",
      new RegExp(`^/${YODA_ENTRY_WITH_COMMENTS.eventName}/${YODA_ENTRY_WITH_COMMENTS.entryId}/`));
    const postLink = homePo.latestCommentsNodeLinks.filter({ hasText: ADMIN_POST_WITH_COMMENTS_TITLE });
    await expect(postLink).toHaveAttribute("href", new RegExp(`^/post/${ADMIN_POST_WITH_COMMENTS}/`));
    await postLink.click();
    await expect(postPo.comments.filter({ hasText: ADMIN_POST_WITH_COMMENTS_COMMENT })).toBeVisible();
  });

  test("shows the featured post set by an administrator", async ({ page, homePo, adminSettingsPo, postPo }) => {
    await loginAs(page, USER_ADMINISTRATOR);
    await homePo.visit();
    await expect(homePo.featuredPost).toHaveCount(0);

    await adminSettingsPo.visit({ edit: "featured_post_id" });
    await adminSettingsPo.valueInput.fill(ADMIN_POST_WITHOUT_COMMENTS.toString());
    await clickAndWaitForLoad(adminSettingsPo.saveButton);
    await expect(adminSettingsPo.settingRow("featured_post_id")).toContainText(ADMIN_POST_WITHOUT_COMMENTS.toString());

    await logout(page);
    await expect(async () => { // The home page is cached for a second
      await homePo.visit();
      await expect(homePo.featuredPostTitle).toContainText(ADMIN_POST_WITHOUT_COMMENTS_TITLE);
    }).toPass();

    await homePo.featuredPostTitle.click();
    await expect(postPo.postTitle).toContainText(ADMIN_POST_WITHOUT_COMMENTS_TITLE);
  });

});
