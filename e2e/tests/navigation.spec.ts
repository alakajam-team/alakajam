import { Page } from "@playwright/test";
import pageListAdmin from "../fixtures/page-list-admin.json";
import pageListCommon from "../fixtures/page-list-common.json";
import pageListUser from "../fixtures/page-list-user.json";
import { loginAs, visit } from "../support/commands";
import { USER_ADMINISTRATOR, USER_DUMBLEDORE } from "../support/data";
import { test } from "../support/test";

async function visitAllPages(page: Page, pages: Record<string, string>) {
  for (const url of Object.values(pages)) {
    await visit(page, url);
  }
}

test.describe("Navigation", () => {

  test("triggers no errors as an administrator", async ({ page }) => {
    await loginAs(page, USER_ADMINISTRATOR);
    await visitAllPages(page, pageListAdmin);
  });

  test("triggers no errors as a simple user", async ({ page }) => {
    await loginAs(page, USER_DUMBLEDORE);
    await visitAllPages(page, pageListUser);
    await visitAllPages(page, pageListCommon);
  });

  test("triggers no errors as an anonymous user", async ({ page }) => {
    await visitAllPages(page, pageListCommon);
  });

});
