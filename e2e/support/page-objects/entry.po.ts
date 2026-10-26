import { Page } from "@playwright/test";
import { CodeMirror } from "../components/code-mirror";

export default class EntryPO {

  public constructor(private readonly page: Page) {
  }

  public async visit({ eventName, entryId }: { eventName: string; entryId: number | string }) {
    await this.page.goto(`/${eventName}/${entryId}`);
  }

  public async writeNewComment(body: string) {
    await this.commentEditor.type(body);
    await this.commentSaveButton.click();
  }

  // Header

  public get entryTitle() {
    return this.page.locator("h1");
  }

  public get entryEditButton() {
    return this.page.locator("h1 .btn-outline-primary");
  }

  // Body

  public get entryInfos() {
    return this.page.locator(".entry__info-value");
  }

  public get description() {
    return this.page.locator(".entry__description");
  }

  public get body() {
    return this.page.locator(".post");
  }

  public get votingBlock() {
    return this.page.locator(".entry-voting, .entry-results");
  }

  public votingRow(categoryTitle: string) {
    return this.page.locator(".entry-voting__category-title", { hasText: categoryTitle })
      .locator("..");
  }

  public votingRanking(categoryTitle: string) {
    return this.votingRow(categoryTitle)
      .locator(".entry-results__category-ranking");
  }

  public votingRating(categoryTitle: string) {
    return this.votingRow(categoryTitle)
      .locator(".entry-results__category-rating");
  }

  public votingStar(categoryTitle: string, rating: number) {
    return this.votingRow(categoryTitle)
      .locator(".js-star")
      .nth(rating);
  }

  public votingSuccessIcon() {
    return this.page.locator(".show-if-saving-success");
  }

  public get links() {
    return this.page.locator(".entry__links");
  }

  public get authors() {
    return this.page.locator(".user-thumb");
  }

  public get relatedPostsTitles() {
    return this.page.locator(".list-group .post__title");
  }

  public get highScores() {
    return this.page.locator("table.table tbody tr");
  }

  public get highScoreSubmitButton() {
    return this.page.locator("#high-scores ~ .btn-primary");
  }

  public get highScoreManageButton() {
    return this.page.locator("#high-scores ~ * .fa-cog");
  }

  // Comments

  public get commentSectionTitle() {
    return this.page.locator("h2");
  }

  public get commentCounter() {
    return this.page.locator("h2 > i");
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

