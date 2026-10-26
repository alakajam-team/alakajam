import { Page } from "@playwright/test";

export default class PeoplePO {

  public constructor(private readonly page: Page) {
  }

  public async visit() {
    await this.page.goto("/explore/people");
  }

  public async submitForm() {
    await Promise.all([
      this.page.waitForEvent("load"),
      this.form.evaluate((form: HTMLFormElement) => form.submit())
    ]);
  }

  public get title() {
    return this.page.locator("h1");
  }

  public get results() {
    return this.page.locator(".user-thumbs");
  }

  public get form() {
    return this.page.locator("form");
  }

  public get nameField() {
    return this.page.locator("input[name=search]");
  }

  public get withEntriesCheckbox() {
    return this.page.locator("input[name=withEntries]");
  }

  public get cancel() {
    return this.page.locator("a.btn-outline-primary");
  }

}

