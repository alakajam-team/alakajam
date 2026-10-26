import { Page } from "@playwright/test";

export default class DashboardPostsPO {

  public constructor(private readonly page: Page) {
  }

  public async visit() {
    await this.page.goto("/dashboard/posts");
  }

  public get createPostButton() {
    return this.page.locator(".btn-primary");
  }

  public get postTitles() {
    return this.page.locator(".post__title");
  }

}

