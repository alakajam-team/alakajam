import { clickAndWaitForLoad } from "../support/commands";
import { DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN, EVENT_NAME_SUBMISSIONS_OPEN, USER_DUMBLEDORE } from "../support/data";
import { expect, test } from "../support/test";

test.describe("Event: Game search", () => {

  test("support searching games", async ({ eventPo }) => {
    await eventPo.visit({ eventName: EVENT_NAME_SUBMISSIONS_OPEN, page: "games" });
    await eventPo.games.titleField.fill(DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN);
    await eventPo.games.userSelect2Dropdown.choose(USER_DUMBLEDORE);
    await clickAndWaitForLoad(eventPo.games.applyButton);

    await expect(eventPo.games.gameLinks).toHaveCount(1);
    await expect(eventPo.games.gamesList).toContainText(DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN);
  });

});
