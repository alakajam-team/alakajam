import { DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN, EVENT_NAME_SUBMISSIONS_OPEN, USER_DUMBLEDORE } from "../support/data";
import eventPo from "../support/page-objects/event.po";

describe("Event: Game search", () => {

  it("support searching games", () => {
    eventPo.visit({ eventName: EVENT_NAME_SUBMISSIONS_OPEN, page: "games" });
    eventPo.games.titleField.type(DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN);
    eventPo.games.userSelect2Dropdown.select2Dropdown(USER_DUMBLEDORE);
    eventPo.games.applyButton.click();

    eventPo.games.gameLinks.should("have.length", 1);
    eventPo.games.gamesList.should("contain.text", DUMBLEDORE_ENTRY_NAME_SUBMISSIONS_OPEN);
  });

});
