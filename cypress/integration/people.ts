class PeoplePage {
  get title() { return cy.get("h1"); }
  get results() { return cy.get(".user-thumbs"); }
  get form() { return cy.get("form"); }
  get nameField() { return cy.get("input[name=search]"); }
  get withEntriesCheckbox() { return cy.get("input[name=withEntries]"); }
  get cancel() { return cy.get("a.btn-default"); }
}

describe("People page", () => {
  const people = new PeoplePage();

  it("lists users", () => {
    cy.visit("/people");
    people.results.should("contain", "Administrator");
  });

  it("lets search users by name, then reset the search", () => {
    cy.visit("/people");

    people.nameField.type("gandalf");
    people.form.submit();
    people.title.should("contain", "(1)");
    people.results.should("contain", "gandalf");
    people.results.should("not.contain", "Administrator");

    people.cancel.click();
    people.title.should("contain", "(2)");
    people.results.should("contain", "Administrator");
  });

  it("lets filter out users without entries", () => {
    cy.visit("/people");

    people.withEntriesCheckbox.click();
    people.form.submit();
    people.title.should("contain", "(1)");
    people.results.should("not.contain", "gandalf");
    people.results.should("contain", "Administrator");
  });
});
