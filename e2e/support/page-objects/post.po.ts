import { Page } from "@playwright/test";
import { CodeMirror } from "../components/code-mirror";

export default class PostPO {

  public constructor(private readonly page: Page) {
  }

  public async visit({ postId }: { postId: number | string }) {
    await this.page.goto(`/post/${postId}`);
  }

  public async writeNewComment(body: string) {
    await this.commentEditor.type(body);
    await this.commentSaveButton.click();
  }

  // Header

  public get postTitle() {
    return this.page.locator(".post__title");
  }

  public get postEditButton() {
    return this.page.locator(".post .btn-outline-secondary");
  }

  public get commentCounter() {
    return this.page.locator(".post__comment-count");
  }

  public get likeCounter() {
    return this.page.locator(".js-like-button");
  }

  public get likeButton() {
    return this.likeCounter;
  }

  /**
   * Author, event and related entry of the post
   */
  public get postDetails() {
    return this.page.locator(".post__details");
  }

  // Body

  public get postBody() {
    return this.page.locator(".post__body");
  }

  // Comments

  public get commentSectionTitle() {
    return this.page.locator("h2");
  }

  public get commentEditButton() {
    return this.page.locator(".comment__details .fa-pencil-alt").first();
  }

  public get commentSaveButton() {
    return this.page.locator("input[name=save]").first();
  }

  public get commentDeleteButton() {
    return this.page.locator("input[name=delete]");
  }

  public get comments() {
    return this.page.locator(".comment");
  }

  public get commentEditor() {
    return new CodeMirror(this.page);
  }

}

