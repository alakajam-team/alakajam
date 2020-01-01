class PeoplePO {

    public visit() {
        cy.visit("/people");
    }

    get title() {
        return cy.get("h1");
    }

    get results() {
        return cy.get(".user-thumbs");
    }

    get form() {
        return cy.get("form");
    }

    get nameField() {
        return cy.get("input[name=search]");
    }

    get withEntriesCheckbox() {
        return cy.get("input[name=withEntries]");
    }

    get cancel() {
        return cy.get("a.btn-default");
    }

}

export default new PeoplePO();
