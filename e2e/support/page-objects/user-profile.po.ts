import { Page } from "@playwright/test";

export default class UserProfilePO {

  public constructor(private readonly page: Page) {
  }

  public async visit(userName: string) {
    await this.page.goto(`/user/${userName}`);
  }

  public get userDisplayName() {
    return this.page.locator(".profile__title");
  }

  public get userName() {
    return this.page.locator(".profile__name");
  }

  public get userBio() {
    return this.page.locator(".featured");
  }

  // Tabs

  public get alakajamGamesTab() {
    return this.page.locator("a[href='#entries']");
  }

  public get otherGamesTab() {
    return this.page.locator("a[href='#entries-ext']");
  }

  public get postsTab() {
    return this.page.locator("a[href='#posts']");
  }

  public get highScoresTab() {
    return this.page.locator("a[href='#scores']");
  }

  // Tab contents

  public get tabContents() {
    return this.page.locator(".tab-content");
  }

}

