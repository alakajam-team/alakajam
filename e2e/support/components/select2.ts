import { Locator, Page } from "@playwright/test";

/**
 * Select2-enhanced <select>. Single selects type their search in the opened dropdown,
 * while multiple selects type it in an inline search field.
 */
export class Select2 {

  public constructor(
    private readonly page: Page,
    private readonly select: Locator,
    private readonly mode: "dropdown" | "search") {
  }

  public async choose(contents: string) {
    await this.select.locator("..").locator("span.select2").click();
    await this.searchField.pressSequentially(contents);
    await this.page.locator(".select2-results__option", { hasText: contents }).first().click();
  }

  private get searchField() {
    if (this.mode === "dropdown") {
      return this.page.locator(".select2-dropdown input");
    } else {
      return this.select.locator("..").locator(".select2-search__field");
    }
  }

}
