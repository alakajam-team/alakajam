import { ADMIN_POST_WITHOUT_COMMENTS, USER_DUMBLEDORE } from "../support/data";
import po from "../support/page-objects";

const entry = po.entry;
const entryEdit = po.entryEdit;
const myEntries = po.dashboard.entries;

describe("Entry", () => {

  beforeEach(() => {
    cy.restoreDB();
    cy.loginAs(USER_DUMBLEDORE);
  });

  it("supports creation, edition and deletion", () => {
      myEntries.visit();
      myEntries.createEntryButton.click();

      entryEdit.titleField.type("My unfinished game");
      entryEdit.saveButton.click();

      entry.entryTitle.should("contain.text", "My unfinished game");

      entry.entryEditButton.click();
      entryEdit.titleField.clear().type("My finished game");
      entryEdit.saveButton.click();

      entry.entryTitle.should("contain.text", "My finished game");

      entry.entryEditButton.click();
      cy.acceptFutureConfirms();
      entryEdit.entryDeleteButton.click();
  })

});