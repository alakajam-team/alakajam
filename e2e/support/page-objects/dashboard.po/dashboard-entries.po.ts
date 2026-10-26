import { Page } from "@playwright/test";

export default class DashboardEntriesPO {

  public constructor(private readonly page: Page) {
  }

  public async visit() {
    await this.page.goto("/dashboard/entries");
  }

  public get createEntryButton() {
    return this.page.locator("[data-test=create]");
  }

  public get importEntryButton() {
    /**
         * NB. If needed, a workaround to test the importer would be to set up a mock server.
         */
    throw new Error("Putting load on external servers for our automated tests is not desired.");
  }

  public get entryTitles() {
    return this.page.locator(".entry-thumb__title");
  }

}

