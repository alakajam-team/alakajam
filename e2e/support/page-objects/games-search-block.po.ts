import { Page } from "@playwright/test";
import { Select2 } from "../components/select2";

export default class GameSearchBlockPO {

  public constructor(protected readonly page: Page) {
  }

  public get title() {
    return this.page.locator("h1");
  }

  public get titleField() {
    return this.page.locator("input[name=search]");
  }

  public get eventSelect() {
    return new Select2(this.page, this.page.locator("select[name=eventId]"), "dropdown");
  }

  public get userSelect2Dropdown() {
    return new Select2(this.page, this.page.locator("select[name=user]"), "dropdown");
  }

  public get platformSelect() {
    return new Select2(this.page, this.page.locator("select[name=platforms]"), "search");
  }

  public get tagSelect() {
    return new Select2(this.page, this.page.locator("select[name=tags]"), "search");
  }

  public get applyButton() {
    return this.page.locator("input[type=submit]");
  }

  public get hideReviewedCheckbox() {
    return this.page.locator("input[name=hideReviewed]");
  }

  public get highScoreSupportCheckbox() {
    return this.page.locator("input[name=highScoresSupport]");
  }

  public get gamesList() {
    return this.page.locator(".game-grid");
  }

  public get gameLinks() {
    return this.page.locator(".entry-thumb");
  }

}
