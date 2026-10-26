import { Page } from "@playwright/test";
import { CodeMirror } from "../components/code-mirror";

export default class PostEditPO {

  public constructor(private readonly page: Page) {
  }

  public async visit({ postId }: { postId: number | string }) {
    await this.page.goto(`/post/${postId}/edit`);
  }

  // Header

  public get titlePreview() {
    return this.page.locator(".post__title");
  }

  // Body

  public get titleInput() {
    return this.page.locator("input[name=title]");
  }

  public get relatedEventDropdown() {
    return this.page.locator("select[name=event-id]");
  }

  public get editor() {
    return new CodeMirror(this.page);
  }

  // Actions

  public get publishButton() {
    return this.page.locator("input[name=publish]");
  }

  public get saveButton() {
    return this.page.locator("input[name=save]").first();
  }

  public get saveDraftButton() {
    return this.page.locator("input[name=save-draft]");
  }

  public get unpublishButton() {
    return this.page.locator("input[name=unpublish]");
  }

  public get deleteButton() {
    return this.page.locator(".btn-danger");
  }

  public get scheduleButton() {
    return this.page.locator("input[value='Schedule...']");
  }

  public get publishedAtField() {
    return this.page.locator("input[name=published-at]");
  }

  public get saveScheduleButton() {
    return this.page.locator("input[name=save-custom]");
  }

}

