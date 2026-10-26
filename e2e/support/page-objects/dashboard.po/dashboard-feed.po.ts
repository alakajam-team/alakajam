import { Page } from "@playwright/test";

export default class DashboardFeedPO {

  public constructor(private readonly page: Page) {
  }

  /**
   * @param options.asUser (admins only) browse the dashboard of another user
   */
  public async visit(options: { asUser?: string } = {}) {
    await this.page.goto("/dashboard/feed" + (options.asUser ? `?user=${options.asUser}` : ""));
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

  /**
   * Comments written by others on the user's posts and entries (or mentioning the user)
   */
  public get commentsToUser() {
    return this.page.locator(".col-md-7 .comment");
  }

  /**
   * Links to the posts/entries of the comments to the user
   */
  public get commentsToUserNodeLinks() {
    return this.page.locator(".col-md-7 .comment a:has(> h4.post__title)");
  }

  /**
   * Latest comments written by the user
   */
  public get commentsByUser() {
    return this.page.locator(".col-md-5 .comment");
  }

  /**
   * Links to the posts/entries of the comments by the user
   */
  public get commentsByUserNodeLinks() {
    return this.page.locator(".col-md-5 .comment a:has(> h4.post__title)");
  }

  public get latestPostsTitles() {
    return this.page.locator(".col-md-5 .list-group-item .post__title");
  }

}

