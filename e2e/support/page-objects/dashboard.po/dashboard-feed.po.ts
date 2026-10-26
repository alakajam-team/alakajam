import { Page } from "@playwright/test";

export default class DashboardFeedPO {

  public constructor(private readonly page: Page) {
  }

  public async visit() {
    await this.page.goto("/dashboard/feed");
  }

  public get invites() {
    return this.page.locator("[data-test=invites]");
  }

  public get inviteAcceptButton() {
    return this.page.locator("[data-test=invites] .btn-primary");
  }

  public get inviteDeclineButton() {
    return this.page.locator("[data-test=invites] .btn-outline-primary");
  }

  public get notifications() {
    return this.page.locator("[data-test=notifications]");
  }

}

