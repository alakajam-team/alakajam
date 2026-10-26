import { Page } from "@playwright/test";

export default class DashboardPasswordPO {

  public constructor(private readonly page: Page) {
  }

  public async visit() {
    await this.page.goto("/dashboard/password");
  }

  public get alert() {
    return this.page.locator(".alert").filter({ visible: true });
  }

  public get currentPasswordField() {
    return this.page.locator("input[name=password]");
  }

  public get newPasswordField() {
    return this.page.locator("input[name=new-password]");
  }

  public get newPasswordBisField() {
    return this.page.locator("input[name=new-password-bis]");
  }

  public get saveButton() {
    return this.page.locator("input[type=submit]");
  }

}

