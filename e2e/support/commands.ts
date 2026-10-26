import { APIRequestContext, expect, Locator, Page } from "@playwright/test";
import HeaderPO from "./page-objects/header.po";
import LoginPO from "./page-objects/login.po";

export async function restoreDB(request: APIRequestContext) {
  const response = await request.post("/admin/dev", {
    form: { restore: "1" }
  });
  await expect(response, "database restoration").toBeOK();
}

export async function loginAs(page: Page, username: string, password?: string) {
  await page.context().clearCookies();
  const loginPo = new LoginPO(page);
  await loginPo.visit();
  await loginPo.nameField.fill(username);
  await loginPo.passwordField.fill(password || username); // For all e2e tests, default passwords are set as the username
  await loginPo.rememberMeField.click(); // Make sessions persist after DB restorations
  await loginPo.submitButton.click();
  await expect(new HeaderPO(page).avatar).toBeVisible();
}

export async function logout(page: Page) {
  await page.context().clearCookies();
  await new LoginPO(page).visit();
}

/**
 * Visits a page, failing if the server responds with an error status.
 */
export async function visit(page: Page, url: string) {
  const response = await page.goto(url);
  expect(response?.status(), `visiting ${url}`).toBeLessThan(400);
}

/**
 * Clicks an element that submits a form or follows a link, then waits for the resulting page to load.
 * Needed whenever the next step does not wait on the new page by itself (e.g. navigating elsewhere right away).
 */
export async function clickAndWaitForLoad(locator: Locator) {
  await Promise.all([
    locator.page().waitForEvent("load"),
    locator.click()
  ]);
}
