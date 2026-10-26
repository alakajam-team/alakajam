import { Page } from "@playwright/test";

export default class HomePO {

  public constructor(private readonly page: Page) {
  }

  public async visit() {
    await this.page.goto("/");
  }

  // Featured post (pinned through the "featured_post_id" setting)

  public get featuredPost() {
    return this.page.locator(".home-welcome--post");
  }

  public get featuredPostTitle() {
    return this.featuredPost.locator(".post__title");
  }

  // Latest posts

  public get postTitles() {
    return this.page.locator(".col-md-8 .post .post__title");
  }

  public post(title: string) {
    return this.page.locator(".col-md-8 .post", {
      has: this.page.locator(".post__title", { hasText: title })
    });
  }

  public postLikeCounter(title: string) {
    return this.post(title).locator(".post__like-count");
  }

  public postCommentCounter(title: string) {
    return this.post(title).locator(".post__comment-count");
  }

  // Latest comments

  public get latestComments() {
    return this.page.locator(".col-md-4 .comment");
  }

  public get latestCommentsNodeLinks() {
    return this.page.locator(".col-md-4 .comment a:has(> h4.post__title)");
  }

}
