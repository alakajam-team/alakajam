import * as site from "../support/page-objects";

describe("People page", () => {
  const peoplePage = site.people;

  beforeEach(() => {
    peoplePage.visit();
  })

  it("lists users", () => {
    peoplePage.results.should("contain", "Administrator");
  });

  it("lets search users by name, then reset the search", () => {
    peoplePage.nameField.type("gandalf");
    peoplePage.form.submit();
    peoplePage.results.should("contain", "gandalf");
    peoplePage.results.should("not.contain", "Administrator");

    peoplePage.cancel.click();
    peoplePage.results.should("contain", "Administrator");
  });

  it("lets filter out users without entries", () => {
    peoplePage.withEntriesCheckbox.click();
    peoplePage.form.submit();
    peoplePage.results.should("not.contain", "noentries");
    peoplePage.results.should("contain", "Administrator");
  });
});
