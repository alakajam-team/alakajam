import { USER_DUMBLEDORE, DUMBLEDORE_ENTRY_WITHOUT_COMMENTS } from "../support/data";
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
    entryEdit.descriptionField.type("The best game ever");
    entryEdit.divisionButton("Solo").click();
    entryEdit.linkLabelFields.first().type("Web");
    entryEdit.linkUrlFields.first().type("http://example.com");
    entryEdit.bodyEditor.typeInEditor("It will be a MMORPG");
    entryEdit.platformsSelect2Search.select2Search("Web");
    entryEdit.tagsSelect2Search.select2Search("MMORPG");
    entryEdit.highScoresOnRadio.click();
    entryEdit.saveButton.click();

    entry.entryTitle.should("contain.text", "My unfinished game");
    entry.description.should("contain.text", "The best game ever");
    entry.entryInfos.should("contain.text", "MMORPG");
    entry.body.should("contain.text", "It will be a MMORPG");
    entry.highScoreSubmitButton.should("exist");

    entry.entryEditButton.click();
    entryEdit.titleField.clear().type("My finished game");
    entryEdit.bodyEditor.clearEditor().typeInEditor("It's a platformer");
    entryEdit.saveButton.click();

    entry.entryTitle.should("contain.text", "My finished game");
    entry.body.should("contain.text", "It's a platformer");

    entry.entryEditButton.click();
    cy.acceptFutureConfirms();
    entryEdit.entryDeleteButton.click();
  })

  it("supports adding comments", () => {
    entry.visit(DUMBLEDORE_ENTRY_WITHOUT_COMMENTS);

    entry.commentEditor.typeInEditor("Welcome to the comments section");
    entry.commentSaveButton.click();

    entry.commentCounter.should("contain.text", "(1)");
    entry.comments.should("contain.text", "Welcome to the comments section");
  });

});