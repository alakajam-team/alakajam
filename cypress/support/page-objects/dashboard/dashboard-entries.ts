import site from "..";

class DashboardEntriesPO {

    visit() {
        cy.visit(`/dashboard/entries`);
    }

    get createEntryButton() {
        return cy.get("[data-test=create]");
    }

    get importEntryButton() {
        /**
         * NB. If needed, a workaround to test the importer would be to set up a mock server.
         */
        throw new Error("Putting load on external servers for our automated tests is not desired.");
    }

    get entryTitles() {
        return cy.get(".entry-thumb__title");
    }

}

export default new DashboardEntriesPO();
