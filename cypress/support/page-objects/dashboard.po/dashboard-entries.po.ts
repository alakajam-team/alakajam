class DashboardEntriesPO {

  public visit() {
    cy.visit("/dashboard/entries");
  }

  public get createEntryButton() {
    return cy.get("[data-test=create]");
  }

  public get importEntryButton() {
    /**
         * NB. If needed, a workaround to test the importer would be to set up a mock server.
         */
    throw new Error("Putting load on external servers for our automated tests is not desired.");
  }

  public get entryTitles() {
    return cy.get(".entry-thumb__title");
  }

}

export default new DashboardEntriesPO();
