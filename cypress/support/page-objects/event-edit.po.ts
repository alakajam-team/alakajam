class EventEditPO {

  public visit({ eventName, page }: {
    eventName: string;
    page?: "edit" | "edit#state" | "edit-themes" | "edit-entries" | "edit-tournament-games";
  }) {
    cy.visit(`/${eventName}/${page || "edit"}`);
  }

  // General > Tabs

  public get appearanceTab() {
    return cy.get("a[href=#appearance]");
  }

  public get stateTab() {
    return cy.get("a[href=#state]");
  }

  public get jamConfigTab() {
    return cy.get("a[href=#jamconfig]");
  }

  // General > Status tab

  public themeVotingStatusRadio(status: "disabled" | "off" | "voting" | "shortlist" | "closed" | "results") {
    return cy.get(`[for=status-theme-${status}]`);
  }

  public entrySubmissionStatusRadio(status: "off" | "open" | "open_unranked" | "closed") {
    return cy.get(`[for=status-entry-${status}]`);
  }

  public entryResultsStatusRadio(status: "disabled" | "off" | "voting" | "voting_rescue" | "results") {
    return cy.get(`[for=status-results-${status}]`);
  }

  public tournamentStatusRadio(status: "disabled" | "off" | "submission" | "playing" | "closed" | "results") {
    return cy.get(`[for=status-tournament-${status}]`);
  }

  // Common

  public get saveButton() {
    return cy.get(".btn-primary");
  }

  public get deleteEventButton() {
    return cy.get(".btn-danger");
  }

  public get alert() {
    return cy.get(".alert");
  }

}

export default new EventEditPO();
