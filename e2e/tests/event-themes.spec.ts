import { loginAs, restoreDB } from "../support/commands";
import { EVENT_NAME_THEME_SHORTLIST, EVENT_NAME_THEME_VOTING, USER_DUMBLEDORE } from "../support/data";
import { expect, test } from "../support/test";

test.describe("Event: Themes", () => {

  test.beforeEach(async ({ page }) => {
    await restoreDB(page.request);
    await loginAs(page, USER_DUMBLEDORE);
  });

  test.afterAll(async ({ request }) => {
    await restoreDB(request);
  });

  test("supports changing submitted themes", async ({ eventPo }) => {
    await eventPo.visit({ eventName: EVENT_NAME_THEME_VOTING, page: "themes" });

    await eventPo.themeIdeaManageButton.click();
    await eventPo.themeIdeaDeleteButtons.first().click();
    await eventPo.themeIdeaFields.first().fill("A much better theme idea");
    await eventPo.themeIdeasSaveButton.click();

    await expect(eventPo.themeIdeas).toContainText(["A much better theme idea"]);
  });

  test("saves theme votes", async ({ eventPo }) => {
    await eventPo.visit({ eventName: EVENT_NAME_THEME_VOTING, page: "themes" });

    await eventPo.themeUpvote.click();
    await expect(eventPo.themePastVotes).toHaveCount(1);

    await eventPo.themeDownvote.click();
    await expect(eventPo.themePastVotes).toHaveCount(2);
  });

  test("saves theme shortlist votes", async ({ eventPo }) => {
    await eventPo.visit({ eventName: EVENT_NAME_THEME_SHORTLIST, page: "themes" });

    await eventPo.enableThemeShortlistSubmitButton();
    await eventPo.themeShortlistSubmitButton.click();
  });

});
