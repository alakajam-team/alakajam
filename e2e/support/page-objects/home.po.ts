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
    return this.page.locator(".carousel-row--posts .post-card .post__title");
  }

  public post(title: string) {
    return this.page.locator(".carousel-row--posts .post-card", {
      has: this.page.locator(".post__title", { hasText: title })
    });
  }

  public postLikeCounter(title: string) {
    return this.post(title).locator(".post__like-count");
  }

  public postCommentCounter(title: string) {
    return this.post(title).locator(".post__comment-count");
  }

  public get postsTitleLink() {
    return this.page.locator(".carousel-row--posts .carousel-row__title-link");
  }

  public get postsCarouselNextArrow() {
    return this.page.locator(".carousel-row--posts .carousel-row__arrow--next");
  }

  public get postsCarouselViewport() {
    return this.page.locator(".carousel-row--posts .carousel-row__viewport");
  }

  // Latest comments

  public get latestComments() {
    return this.page.locator(".carousel-row--comments .comment-card");
  }

  public get latestCommentsNodeLinks() {
    return this.page.locator(".carousel-row--comments .comment-card a:has(> h4.post__title)");
  }

}
