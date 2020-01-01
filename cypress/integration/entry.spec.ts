import {
  DUMBLEDORE_ENTRY_EMPTY_HIGHSCORES,
  DUMBLEDORE_ENTRY_TEAM_DIVISION,
  DUMBLEDORE_ENTRY_WITHOUT_COMMENTS,
  USER_DUMBLEDORE,
  USER_GANDALF
} from "../support/data";
import dashboardPo from "../support/page-objects/dashboard.po";
import entryEditPo from "../support/page-objects/entry-edit.po";
import entryPo from "../support/page-objects/entry.po";
import headerPo from "../support/page-objects/header.po";
import entryHighscoreSubmitPo from "../support/page-objects/entry-highscore-submit.po";

describe("Entry", () => {

  beforeEach(() => {
    cy.restoreDB();
    cy.loginAs(USER_DUMBLEDORE);
  });

  afterEach(() => {
    cy.restoreDB();
  });

  it("supports creation, edition and deletion", () => {
    dashboardPo.entries.visit();
    dashboardPo.entries.createEntryButton.click();

    entryEditPo.titleField.type("My unfinished game");
    entryEditPo.descriptionField.type("The best game ever");
    entryEditPo.divisionButton("Solo").click();
    entryEditPo.linkLabelFields.first().type("Web");
    entryEditPo.linkUrlFields.first().type("http://example.com");
    entryEditPo.bodyEditor.typeInEditor("It will be a MMORPG");
    entryEditPo.platformsSelect2Search.select2Search("Web");
    entryEditPo.tagsSelect2Search.select2Search("MMORPG");
    entryEditPo.highScoresOnRadio.click();
    entryEditPo.saveButton.click();

    entryPo.entryTitle.should("contain.text", "My unfinished game");
    entryPo.description.should("contain.text", "The best game ever");
    entryPo.entryInfos.should("contain.text", "MMORPG");
    entryPo.body.should("contain.text", "It will be a MMORPG");
    entryPo.highScoreSubmitButton.should("exist");

    entryPo.entryEditButton.click();
    entryEditPo.titleField.clear().type("My finished game");
    entryEditPo.bodyEditor.clearEditor().typeInEditor("It's a platformer");
    entryEditPo.saveButton.click();

    entryPo.entryTitle.should("contain.text", "My finished game");
    entryPo.body.should("contain.text", "It's a platformer");

    entryPo.entryEditButton.click();
    entryEditPo.entryDeleteButton.click();
  });

  it("supports adding comments", () => {
    entryPo.visit(DUMBLEDORE_ENTRY_WITHOUT_COMMENTS);

    entryPo.commentEditor.typeInEditor("Welcome to the comments section");
    entryPo.commentSaveButton.click();

    entryPo.commentCounter.should("contain.text", "(1)");
    entryPo.comments.should("contain.text", "Welcome to the comments section");
  });

  it("supports inviting someone to our team", () => {
    entryEditPo.visit(DUMBLEDORE_ENTRY_TEAM_DIVISION);

    entryEditPo.teamMembersSelect2Search.select2Search("gandalf");
    entryEditPo.saveButton.click();

    cy.loginAs(USER_GANDALF);
    cy.visit("/"); // XXX notifications don't appear upon login, only on the next page
    headerPo.notificationCount.should("contain.text", "1");
    headerPo.avatar.click();
    dashboardPo.feed.inviteAcceptButton.click();

    entryEditPo.visit(DUMBLEDORE_ENTRY_TEAM_DIVISION);
    entryEditPo.titleField.clear().type("Better game title");
    entryEditPo.saveButton.click();
  });

  it("supports submitting, updating and deleting high scores", () => {
    entryPo.visit(DUMBLEDORE_ENTRY_EMPTY_HIGHSCORES);

    entryPo.highScoreSubmitButton.click();
    entryHighscoreSubmitPo.scoreField.type("999");
    entryHighscoreSubmitPo.proofPictureField.dropFile();
    entryHighscoreSubmitPo.saveButton.click();

    entryPo.highScores.should("contain.text", "1 score");
    entryPo.highScores.should("contain.text", USER_DUMBLEDORE);
    entryPo.highScores.should("contain.text", "999");

    entryPo.highScoreSubmitButton.click();
    entryHighscoreSubmitPo.scoreField.clear().type("1000");
    entryHighscoreSubmitPo.saveButton.click();

    entryPo.highScores.should("contain.text", "1 score");
    entryPo.highScores.should("contain.text", USER_DUMBLEDORE);
    entryPo.highScores.should("contain.text", "1000");

    entryPo.highScoreSubmitButton.click();
    entryHighscoreSubmitPo.deleteButton.click();

    entryPo.highScores.should("not.contain.text", USER_DUMBLEDORE);
  });

});
