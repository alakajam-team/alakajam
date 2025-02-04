import peoplePo from "../support/page-objects/people.po";

describe("People page", () => {

  beforeEach(() => {
    peoplePo.visit();
  });

  it("lists users", () => {
    peoplePo.results.should("contain", "Administrator");
  });

  it("lets search users by name, then reset the search", () => {
    peoplePo.nameField.type("gandalf");
    peoplePo.form.submit();
    peoplePo.results.should("contain", "gandalf");
    peoplePo.results.should("not.contain", "Administrator");

    peoplePo.cancel.click();
    peoplePo.results.should("contain", "Administrator");
  });

  it("lets filter out users without entries", () => {
    peoplePo.withEntriesCheckbox.click();
    peoplePo.form.submit();
    peoplePo.results.should("not.contain", "noentries");
    peoplePo.results.should("contain", "Administrator");
  });
});
