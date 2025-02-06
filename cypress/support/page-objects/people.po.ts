class PeoplePO {

  public visit() {
    cy.visit("/explore/people");
  }

  public get title() {
    return cy.get("h1");
  }

  public get results() {
    return cy.get(".user-thumbs");
  }

  public get form() {
    return cy.get("form");
  }

  public get nameField() {
    return cy.get("input[name=search]");
  }

  public get withEntriesCheckbox() {
    return cy.get("input[name=withEntries]");
  }

  public get cancel() {
    return cy.get("a.btn-outline-primary");
  }

}

export default new PeoplePO();
