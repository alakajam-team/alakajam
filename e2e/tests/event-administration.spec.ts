import { clickAndWaitForLoad, loginAs, restoreDB } from "../support/commands";
import { EVENT_NAME_SUBMISSIONS_OPEN, EVENT_NAME_THEME_SHORTLIST, EVENT_NAME_THEME_VOTING, USER_ADMINISTRATOR } from "../support/data";
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

});
