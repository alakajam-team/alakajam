import po from "../support/page-objects";

describe("People page", () => {
  const people = po.people;

  beforeEach(() => {
    people.visit();
  });

  it("lists users", () => {
    people.results.should("contain", "Administrator");
  });

  it("lets search users by name, then reset the search", () => {
    people.nameField.type("gandalf");
    people.form.submit();
    people.results.should("contain", "gandalf");
    people.results.should("not.contain", "Administrator");

    people.cancel.click();
    people.results.should("contain", "Administrator");
  });

  it("lets filter out users without entries", () => {
    people.withEntriesCheckbox.click();
    people.form.submit();
    people.results.should("not.contain", "noentries");
    people.results.should("contain", "Administrator");
  });
});
