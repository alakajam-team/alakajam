import { Page } from "@playwright/test";

export default class HeaderPO {

  public constructor(private readonly page: Page) {
  }

  public get avatar() {
    return this.page.locator(".dropdown .navbar-avatar");
  }

  public get notificationCount() {
    return this.page.locator(".navbar-unread-notifications");
  }

  public get openButton() {
    return this.page.locator(".dropdown-toggle");
  }

  public get dashboardLink() {
    return this.page.locator(".dropdown-menu a").nth(1);
  }

  public get settingsLink() {
    return this.page.locator("a[href='/dashboard/settings']");
  }

  public get myEntriesLink() {
    return this.page.locator("a[href='/dashboard/entries']");
  }

  public get myPostsLink() {
    return this.page.locator("a[href='/dashboard/posts']");
  }

  public get myScoresLink() {
    return this.page.locator("a[href='/dashboard/scores']");
  }

  public get logoutLink() {
    return this.page.locator("a[href='/logout']");
  }

}

