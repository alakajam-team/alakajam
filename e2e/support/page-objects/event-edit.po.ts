import { Page } from "@playwright/test";

export default class EventEditPO {

  public constructor(private readonly page: Page) {
  }

  public async visit({ eventName, page }: {
    eventName: string;
    page?: "edit" | "edit#state" | "edit-themes" | "edit-entries" | "edit-tournament-games";
  }) {
    await this.page.goto(`/${eventName}/${page || "edit"}`);
  }

  // General > Tabs

  public get appearanceTab() {
    return this.page.locator("a[href='#appearance']");
  }

  public get stateTab() {
    return this.page.locator("a[href='#state']");
  }

  public get jamConfigTab() {
    return this.page.locator("a[href='#jamconfig']");
  }

  // General > Status tab

  public themeVotingStatusRadio(status: "disabled" | "off" | "voting" | "shortlist" | "closed" | "results") {
    return this.page.locator(`[for=status-theme-${status}]`);
  }

  public entrySubmissionStatusRadio(status: "off" | "open" | "open_unranked" | "closed") {
    return this.page.locator(`[for=status-entry-${status}]`);
  }

  public entryResultsStatusRadio(status: "disabled" | "off" | "voting" | "voting_rescue" | "results") {
    return this.page.locator(`[for=status-results-${status}]`);
  }

  public tournamentStatusRadio(status: "disabled" | "off" | "submission" | "playing" | "closed" | "results") {
    return this.page.locator(`[for=status-tournament-${status}]`);
  }

  /**
   * Sets a status field to a post ID, through the radio with a "Post ID" text field.
   * Rules are edited from the Appearance tab, other statuses from the State tab.
   */
  public async setStatusToPostId(status: "status-rules" | "status-theme" | "status-results", postId: number | string) {
    if (status === "status-rules") {
      await this.appearanceTab.click();
    } else {
      await this.stateTab.click();
    }
    await this.statusPostIdRadio(status).click();
    const textField = this.statusPostIdField(status);
    await textField.fill(postId.toString());
    await textField.dispatchEvent("change"); // Copies the text field value into the radio value
  }

  public statusPostIdRadio(status: "status-rules" | "status-theme" | "status-results") {
    return this.page.locator(`label[for^=${status}]`, { has: this.statusPostIdField(status) })
      .locator(".iradio_flat"); // Radio styled by iCheck
  }

  public statusPostIdField(status: "status-rules" | "status-theme" | "status-results") {
    return this.page.locator(`.js-radio-text-field[data-target^=${status}]`);
  }

  // Common

  public get saveButton() {
    return this.page.locator(".btn-primary");
  }

  public get deleteEventButton() {
    return this.page.locator(".btn-danger");
  }

  public get alert() {
    return this.page.locator(".alert").filter({ visible: true });
  }

}

