import {
  DUMBLEDORE_ENTRY_EMPTY_HIGHSCORES,
  DUMBLEDORE_ENTRY_TEAM_DIVISION,
  DUMBLEDORE_ENTRY_WITHOUT_COMMENTS,
  USER_DUMBLEDORE,
  USER_GANDALF
} from "../support/data";
import po from "../support/page-objects";

const { entry, entryEdit, entryHighscoreSubmit } = po;
const myEntries = po.dashboard.entries;

describe("Entry", () => {

  beforeEach(() => {
    cy.restoreDB();
    cy.loginAs(USER_DUMBLEDORE);
  });

  afterEach(() => {
    cy.restoreDB();
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
    entryEdit.entryDeleteButton.click();
  });

  it("supports adding comments", () => {
    entry.visit(DUMBLEDORE_ENTRY_WITHOUT_COMMENTS);

    entry.commentEditor.typeInEditor("Welcome to the comments section");
    entry.commentSaveButton.click();

    entry.commentCounter.should("contain.text", "(1)");
    entry.comments.should("contain.text", "Welcome to the comments section");
  });

  it("supports inviting someone to our team", () => {
    entryEdit.visit(DUMBLEDORE_ENTRY_TEAM_DIVISION);

    entryEdit.teamMembersSelect2Search.select2Search("gandalf");
    entryEdit.saveButton.click();

    cy.loginAs(USER_GANDALF);
    cy.visit("/"); // XXX notifications don't appear upon login, only on the next page
    po.header.notificationCount.should("contain.text", "1");
    po.header.avatar.click();
    po.dashboard.feed.inviteAcceptButton.click();

    entryEdit.visit(DUMBLEDORE_ENTRY_TEAM_DIVISION);
    entryEdit.titleField.clear().type("Better game title");
    entryEdit.saveButton.click();
  });

  it("supports submitting, updating and deleting high scores", () => {
    entry.visit(DUMBLEDORE_ENTRY_EMPTY_HIGHSCORES);

    entry.highScoreSubmitButton.click();
    entryHighscoreSubmit.scoreField.type("999");
    entryHighscoreSubmit.proofPictureField.dropFile();
    entryHighscoreSubmit.saveButton.click();

    entry.highScores.should("contain.text", "1 score");
    entry.highScores.should("contain.text", USER_DUMBLEDORE);
    entry.highScores.should("contain.text", "999");

    entry.highScoreSubmitButton.click();
    entryHighscoreSubmit.scoreField.clear().type("1000");
    entryHighscoreSubmit.saveButton.click();

    entry.highScores.should("contain.text", "1 score");
    entry.highScores.should("contain.text", USER_DUMBLEDORE);
    entry.highScores.should("contain.text", "1000");

    entry.highScoreSubmitButton.click();
    entryHighscoreSubmit.deleteButton.click();

    entry.highScores.should("not.contain.text", USER_DUMBLEDORE);
  });

});
