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

