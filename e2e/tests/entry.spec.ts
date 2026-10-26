import { clickAndWaitForLoad, loginAs, restoreDB } from "../support/commands";
import {
  DEFAULT_PICTURE,
  DUMBLEDORE_ENTRY_EMPTY_HIGHSCORES,
  DUMBLEDORE_ENTRY_TEAM_DIVISION,
  DUMBLEDORE_ENTRY_WITHOUT_COMMENTS,
  USER_DUMBLEDORE,
  USER_GANDALF
} from "../support/data";
import { expect, test } from "../support/test";

test.describe("Entry", () => {

  test.beforeEach(async ({ page }) => {
    await restoreDB(page.request);
    await loginAs(page, USER_DUMBLEDORE);
  });

  test.afterAll(async ({ request }) => {
    await restoreDB(request);
  });

  test("supports creation, edition and deletion", async ({ dashboardPo, entryEditPo, entryPo }) => {
    await dashboardPo.entries.visit();
    await dashboardPo.entries.createEntryButton.click();

    await entryEditPo.titleField.fill("My unfinished game");
    await entryEditPo.descriptionField.fill("The best game ever");
    await entryEditPo.divisionButton("Solo").click();
    await entryEditPo.linkLabelFields.first().fill("Web");
    await entryEditPo.linkUrlFields.first().fill("http://example.com");
    await entryEditPo.bodyEditor.type("It will be a MMORPG");
    await entryEditPo.platformsSelect2Search.choose("Web");
    await entryEditPo.tagsSelect2Search.choose("MMORPG");
    await entryEditPo.highScoresOnRadio.click();
    await clickAndWaitForLoad(entryEditPo.saveButton);

    await expect(entryPo.entryTitle).toContainText("My unfinished game");
    await expect(entryPo.description).toContainText("The best game ever");
    await expect(entryPo.entryInfos).toContainText(["MMORPG"]);
    await expect(entryPo.body).toContainText("It will be a MMORPG");
    await expect(entryPo.highScoreSubmitButton).toBeAttached();

    await entryPo.entryEditButton.click();
    await entryEditPo.titleField.fill("My finished game");
    await entryEditPo.bodyEditor.clear();
    await entryEditPo.bodyEditor.type("It's a platformer");
    await clickAndWaitForLoad(entryEditPo.saveButton);

    await expect(entryPo.entryTitle).toContainText("My finished game");
    await expect(entryPo.body).toContainText("It's a platformer");

    await entryPo.entryEditButton.click();
    await clickAndWaitForLoad(entryEditPo.entryDeleteButton);
  });

  test("supports adding comments", async ({ entryPo }) => {
    await entryPo.visit(DUMBLEDORE_ENTRY_WITHOUT_COMMENTS);

    await entryPo.commentEditor.type("Welcome to the comments section");
    await entryPo.commentSaveButton.click();

    await expect(entryPo.commentCounter).toContainText("(1)");
    await expect(entryPo.comments).toContainText(["Welcome to the comments section"]);
  });

  test("supports inviting someone to our team", async ({ page, entryEditPo, headerPo, dashboardPo }) => {
    await entryEditPo.visit(DUMBLEDORE_ENTRY_TEAM_DIVISION);

    await entryEditPo.teamMembersSelect2Search.choose("gandalf");
    await clickAndWaitForLoad(entryEditPo.saveButton);

    await loginAs(page, USER_GANDALF);
    await page.goto("/"); // XXX notifications don't appear upon login, only on the next page
    await expect(headerPo.notificationCount).toContainText("1");
    await headerPo.avatar.click();
    await clickAndWaitForLoad(dashboardPo.feed.inviteAcceptButton);

    await entryEditPo.visit(DUMBLEDORE_ENTRY_TEAM_DIVISION);
    await entryEditPo.titleField.fill("Better game title");
    await clickAndWaitForLoad(entryEditPo.saveButton);
  });

  test("supports submitting, updating and deleting high scores", async ({ entryPo, entryHighscoreSubmitPo }) => {
    await entryPo.visit(DUMBLEDORE_ENTRY_EMPTY_HIGHSCORES);

    await entryPo.highScoreSubmitButton.click();
    await entryHighscoreSubmitPo.scoreField.fill("999");
    await entryHighscoreSubmitPo.proofPictureField.setInputFiles(DEFAULT_PICTURE);
    await clickAndWaitForLoad(entryHighscoreSubmitPo.saveButton);

    await expect(entryPo.highScores).toContainText(["1 score"]);
    await expect(entryPo.highScores).toContainText([USER_DUMBLEDORE]);
    await expect(entryPo.highScores).toContainText(["999"]);

    await entryPo.highScoreSubmitButton.click();
    await entryHighscoreSubmitPo.scoreField.fill("1000");
    await clickAndWaitForLoad(entryHighscoreSubmitPo.saveButton);

    await expect(entryPo.highScores).toContainText(["1 score"]);
    await expect(entryPo.highScores).toContainText([USER_DUMBLEDORE]);
    await expect(entryPo.highScores).toContainText(["1000"]);

    await entryPo.highScoreSubmitButton.click();
    await clickAndWaitForLoad(entryHighscoreSubmitPo.deleteButton);

    await expect(entryPo.highScores.filter({ hasText: USER_DUMBLEDORE })).toHaveCount(0);
  });

});
