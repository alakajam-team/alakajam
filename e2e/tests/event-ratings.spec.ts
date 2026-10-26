import { loginAs, restoreDB } from "../support/commands";
import { GANDALF_RANKED_GAME, USER_DUMBLEDORE } from "../support/data";
import { expect, test } from "../support/test";

test.describe("Event: Ratings", () => {

  test.beforeEach(async ({ page }) => {
    await restoreDB(page.request);
    await loginAs(page, USER_DUMBLEDORE);
  });

  test.afterAll(async ({ request }) => {
    await restoreDB(request);
  });

  test("supports changing ratings", async ({ entryPo }) => {
    await entryPo.visit(GANDALF_RANKED_GAME);

    await entryPo.votingStar("Awesomeness", 5).click();
    await expect(entryPo.votingSuccessIcon()).toBeVisible();
    await entryPo.votingStar("Beauty", 8).click();
    await expect(entryPo.votingSuccessIcon()).toBeVisible();

    await expect(entryPo.votingRow("Awesomeness")).toContainText("5");
    await expect(entryPo.votingRow("Beauty")).toContainText("8");
  });

});
