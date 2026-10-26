import { Page } from "@playwright/test";

export default class AdminDevPO {

  public constructor(private readonly page: Page) {
  }

  public async visit() {
    await this.page.goto("/admin/dev");
  }

  public get alert() {
    return this.page.locator(".alert").filter({ visible: true });
  }

  public get backupButton() {
    throw new Error("Do not make backups during tests. A backup is already done on server start (see e2e.ts");
  }

  public get restoreButton() {
    return this.page.locator("input[name=restore]");
  }

}

