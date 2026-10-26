import { Page } from "@playwright/test";

export default class LoginPO {

  public constructor(private readonly page: Page) {
  }

  public async visit() {
    await this.page.goto("/login");
  }

  public get nameField() {
    return this.page.locator("#name");
  }

  public get passwordField() {
    return this.page.locator("#password");
  }

  public get rememberMeField() {
    return this.page.locator("input[type=checkbox]");
  }

  public get submitButton() {
    return this.page.locator("button[type=submit]");
  }

}

