import { clickAndWaitForLoad, createPost, expectNotFound, loginAs, restoreDB, visit } from "../support/commands";
import {
  DEFAULT_PICTURE,
  DUMBLEDORE_ENTRY_EMPTY_HIGHSCORES,
  DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN,
  DUMBLEDORE_ENTRY_SUBMISSIONS_OPEN,
  DUMBLEDORE_ENTRY_TEAM_DIVISION,
  DUMBLEDORE_ENTRY_WITHOUT_COMMENTS,
  EVENT_NAME_SUBMISSIONS_OPEN,
  EVENT_TITLE_SUBMISSIONS_OPEN,
  USER_ADMINISTRATOR,
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

  test("supports editing and deleting comments", async ({ entryPo }) => {
    await entryPo.visit(DUMBLEDORE_ENTRY_WITHOUT_COMMENTS);
    await entryPo.writeNewComment("Hello world!");
    await expect(entryPo.comments).toContainText(["Hello world!"]);

    await entryPo.commentEditButton.click();
    await entryPo.commentEditor.clear();
    await entryPo.commentEditor.type("Goodbye world!");
    await entryPo.commentSaveButton.click();
    await expect(entryPo.comments.filter({ hasText: "Hello world!" })).toHaveCount(0);
    await expect(entryPo.comments).toContainText(["Goodbye world!"]);
    await expect(entryPo.commentCounter).toContainText("(1)");

    await entryPo.commentEditButton.click();
    await entryPo.commentDeleteButton.click();
    await expect(entryPo.comments.filter({ hasText: "Goodbye world!" })).toHaveCount(0);
    await expect(entryPo.commentCounter).toContainText("(0)");
  });

  test("supports deleting an entry with comments and posts", async ({ page, entryPo, entryEditPo, postPo, dashboardPo, eventPo,
    homePo, userProfilePo }) => {
    const postPath = await createPost(page, {
      title: "Devlog #1",
      body: "Things are going well",
      eventTitle: EVENT_TITLE_SUBMISSIONS_OPEN
    });
    await expect(postPo.postDetails).toContainText(DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN);

    await loginAs(page, USER_GANDALF);
    await entryPo.visit(DUMBLEDORE_ENTRY_SUBMISSIONS_OPEN);
    await entryPo.writeNewComment("Can't wait to play it");
    await expect(entryPo.comments).toContainText(["Can't wait to play it"]);
    await dashboardPo.feed.visit();
    await expect(dashboardPo.feed.commentsByUser).toContainText(["Can't wait to play it"]);

    await loginAs(page, USER_DUMBLEDORE);
    await dashboardPo.feed.visit();
    await expect(dashboardPo.feed.commentsToUser).toContainText(["Can't wait to play it"]);

    await entryPo.visit(DUMBLEDORE_ENTRY_SUBMISSIONS_OPEN);
    const entryPath = new URL(page.url()).pathname;
    await entryPo.entryEditButton.click();
    await clickAndWaitForLoad(entryEditPo.entryDeleteButton);

    await expectNotFound(page, entryPath);

    // The post survives, without the link to the entry
    await visit(page, postPath);
    await expect(postPo.postTitle).toContainText("Devlog #1");
    await expect(postPo.postDetails).not.toContainText(DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN);
    await visit(page, `/${EVENT_NAME_SUBMISSIONS_OPEN}/posts`);
    await expect(eventPo.postDetails("Devlog #1")).not.toContainText(DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN);

    await visit(page, "/dashboard/feed");
    await expect(dashboardPo.feed.commentsToUser.filter({ hasText: "Can't wait to play it" })).toHaveCount(0);
    await visit(page, "/dashboard/entries");
    await expect(dashboardPo.entries.entryTitles.filter({ hasText: DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN })).toHaveCount(0);
    await visit(page, `/user/${USER_DUMBLEDORE}`);
    await expect(userProfilePo.alakajamEntriesTitles.filter({ hasText: DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN })).toHaveCount(0);
    await expect(async () => { // The home page is cached for a second
      await visit(page, "/");
      await expect(homePo.latestComments.first()).toBeVisible();
      await expect(homePo.latestComments.filter({ hasText: "Can't wait to play it" })).toHaveCount(0);
    }).toPass();

    await loginAs(page, USER_GANDALF);
    await visit(page, "/dashboard/feed");
    await expect(dashboardPo.feed.commentsByUser.filter({ hasText: "Can't wait to play it" })).toHaveCount(0);
  });

  test("supports inviting someone to our team", async ({ page, entryEditPo, entryPo, headerPo, dashboardPo, userProfilePo }) => {
    await entryEditPo.visit(DUMBLEDORE_ENTRY_TEAM_DIVISION);

    await entryEditPo.teamMembersSelect2Search.choose("gandalf");
    await clickAndWaitForLoad(entryEditPo.saveButton);

    await loginAs(page, USER_GANDALF);
    await page.goto("/"); // XXX notifications don't appear upon login, only on the next page
    await expect(headerPo.notificationCount).toContainText("1");
    await headerPo.avatar.click();
    await clickAndWaitForLoad(dashboardPo.feed.inviteAcceptButton);

    await entryEditPo.visit(DUMBLEDORE_ENTRY_TEAM_DIVISION);
    await entryEditPo.titleField.fill("Our team game");
    await clickAndWaitForLoad(entryEditPo.saveButton);

    await expect(entryPo.entryTitle).toContainText("Our team game");
    await expect(entryPo.authors).toContainText([USER_DUMBLEDORE, USER_GANDALF]);

    await dashboardPo.entries.visit();
    await expect(dashboardPo.entries.entryTitles).toContainText(["Our team game"]);
    await userProfilePo.visit(USER_GANDALF);
    await expect(userProfilePo.externalEntriesTitles).toContainText(["Our team game"]);
    await userProfilePo.visit(USER_DUMBLEDORE);
    await expect(userProfilePo.externalEntriesTitles).toContainText(["Our team game"]);

    // Comments notify all team members
    await loginAs(page, USER_ADMINISTRATOR);
    await entryPo.visit(DUMBLEDORE_ENTRY_TEAM_DIVISION);
    await entryPo.writeNewComment("Nice teamwork");
    await expect(entryPo.comments).toContainText(["Nice teamwork"]);

    for (const teamMember of [USER_DUMBLEDORE, USER_GANDALF]) {
      await loginAs(page, teamMember);
      await dashboardPo.feed.visit();
      await expect(dashboardPo.feed.commentsToUser).toContainText(["Nice teamwork"]);
      await expect(dashboardPo.feed.commentsToUserNodeLinks.filter({ hasText: "Our team game" })).toHaveAttribute("href",
        new RegExp(`^/${DUMBLEDORE_ENTRY_TEAM_DIVISION.eventName}/${DUMBLEDORE_ENTRY_TEAM_DIVISION.entryId}/`));
    }
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
