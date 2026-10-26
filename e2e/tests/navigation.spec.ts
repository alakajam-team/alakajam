import { Page } from "@playwright/test";
import { loginAs, visit } from "../support/commands";
import { USER_ADMINISTRATOR, USER_DUMBLEDORE } from "../support/data";
import { PAGES_ADMIN, PAGES_COMMON, PAGES_USER } from "../support/page-lists";
import { test } from "../support/test";

async function visitAllPages(page: Page, pages: Record<string, string>) {
  for (const url of Object.values(pages)) {
    await visit(page, url);
  }
}

test.describe("Navigation", () => {

  test("triggers no errors as an administrator", async ({ page }) => {
    await loginAs(page, USER_ADMINISTRATOR);
    await visitAllPages(page, PAGES_ADMIN);
  });

  test("triggers no errors as a simple user", async ({ page }) => {
    await loginAs(page, USER_DUMBLEDORE);
    await visitAllPages(page, PAGES_USER);
    await visitAllPages(page, PAGES_COMMON);
  });

  test("triggers no errors as an anonymous user", async ({ page }) => {
    await visitAllPages(page, PAGES_COMMON);
  });

});
