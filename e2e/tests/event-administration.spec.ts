import { clickAndWaitForLoad, loginAs, restoreDB } from "../support/commands";
import {
  ADMIN_POST_WITHOUT_COMMENTS,
  ADMIN_POST_WITHOUT_COMMENTS_TITLE,
  EVENT_NAME_GAME_RATINGS,
  EVENT_NAME_SUBMISSIONS_OPEN,
  EVENT_NAME_THEME_SHORTLIST,
  EVENT_NAME_THEME_VOTING,
  EVENT_SUBMISSIONS_OPEN_RULES_POST,
  EVENT_SUBMISSIONS_OPEN_RULES_POST_TITLE,
  USER_ADMINISTRATOR
} from "../support/data";
import { expect, test } from "../support/test";

test.describe("Event: Administration", () => {

  test.beforeEach(async ({ page }) => {
    await restoreDB(page.request);
    await loginAs(page, USER_ADMINISTRATOR);
  });

  test.afterAll(async ({ request }) => {
    await restoreDB(request);
  });

  test("supports switching from theme submissions to theme shortlist phase", async ({ eventEditPo }) => {
    await eventEditPo.visit({ eventName: EVENT_NAME_THEME_VOTING, page: "edit#state" });
    await eventEditPo.themeVotingStatusRadio("shortlist").click();
    await clickAndWaitForLoad(eventEditPo.saveButton);
    await expect(eventEditPo.alert).toContainText("Theme shortlist computed");
  });

  test("supports publishing the theme shortlist results", async ({ eventEditPo, eventPo }) => {
    await eventEditPo.visit({ eventName: EVENT_NAME_THEME_SHORTLIST, page: "edit#state" });
    await eventEditPo.themeVotingStatusRadio("results").click();
    await clickAndWaitForLoad(eventEditPo.saveButton);

    await eventPo.visit({ eventName: EVENT_NAME_THEME_SHORTLIST, page: "themes" });
    await expect(eventPo.themeShortlistWinner).toContainText("Dog");
  });

  test("supports publishing the game ratings results", async ({ eventEditPo }) => {
    await eventEditPo.visit({ eventName: EVENT_NAME_SUBMISSIONS_OPEN, page: "edit#state" });
    await eventEditPo.entryResultsStatusRadio("results").click();
    await clickAndWaitForLoad(eventEditPo.saveButton);
    await expect(eventEditPo.alert).toContainText("Event results computed");
  });

  test("links to the rules post from the event dashboard", async ({ page, eventPo, postPo }) => {
    await eventPo.visit({ eventName: EVENT_NAME_SUBMISSIONS_OPEN, page: "dashboard" });
    await expect(eventPo.rulesLink).toHaveAttribute("href", new RegExp(`^/post/${EVENT_SUBMISSIONS_OPEN_RULES_POST}(/|$)`));

    await clickAndWaitForLoad(eventPo.rulesLink);
    await expect(page).toHaveURL(/\/post\//);
    await expect(postPo.postTitle).toContainText(EVENT_SUBMISSIONS_OPEN_RULES_POST_TITLE);
  });

  test("supports setting the rules to a post", async ({ page, eventEditPo, eventPo, postPo }) => {
    await eventEditPo.visit({ eventName: EVENT_NAME_THEME_VOTING });
    await eventEditPo.setStatusToPostId("status-rules", ADMIN_POST_WITHOUT_COMMENTS);
    await clickAndWaitForLoad(eventEditPo.saveButton);
    await eventEditPo.appearanceTab.click();
    await expect(eventEditPo.statusPostIdField("status-rules")).toHaveValue(ADMIN_POST_WITHOUT_COMMENTS.toString());

    await eventPo.visit({ eventName: EVENT_NAME_THEME_VOTING, page: "dashboard" });
    await clickAndWaitForLoad(eventPo.joinEventButton);
    await eventPo.visit({ eventName: EVENT_NAME_THEME_VOTING, page: "dashboard" });
    await clickAndWaitForLoad(eventPo.rulesLink);
    await expect(page).toHaveURL(/\/post\//);
    await expect(postPo.postTitle).toContainText(ADMIN_POST_WITHOUT_COMMENTS_TITLE);
  });

  test("supports replacing the themes page with a post", async ({ eventEditPo, eventPo }) => {
    await eventEditPo.visit({ eventName: EVENT_NAME_THEME_VOTING });
    await eventEditPo.setStatusToPostId("status-theme", ADMIN_POST_WITHOUT_COMMENTS);
    await clickAndWaitForLoad(eventEditPo.saveButton);
    await expect(eventEditPo.statusPostIdField("status-theme")).toHaveValue(ADMIN_POST_WITHOUT_COMMENTS.toString());

    await eventPo.visit({ eventName: EVENT_NAME_THEME_VOTING, page: "themes" });
    await expect(eventPo.postsTitles).toContainText([ADMIN_POST_WITHOUT_COMMENTS_TITLE]);
    await expect(eventPo.themeVoteLabel).toHaveCount(0);
  });

  test("supports replacing the results page with a post", async ({ eventEditPo, eventPo }) => {
    await eventEditPo.visit({ eventName: EVENT_NAME_GAME_RATINGS });
    await eventEditPo.setStatusToPostId("status-results", ADMIN_POST_WITHOUT_COMMENTS);
    await clickAndWaitForLoad(eventEditPo.saveButton);
    await expect(eventEditPo.statusPostIdField("status-results")).toHaveValue(ADMIN_POST_WITHOUT_COMMENTS.toString());

    await eventPo.visit({ eventName: EVENT_NAME_GAME_RATINGS, page: "results" });
    await expect(eventPo.postsTitles).toContainText([ADMIN_POST_WITHOUT_COMMENTS_TITLE]);
  });

});
