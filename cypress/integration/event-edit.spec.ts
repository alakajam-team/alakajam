import { EVENT_NAME_SUBMISSIONS_OPEN } from "../support/data";
import eventEditPo from "../support/page-objects/event-edit.po";

describe("Event: Edit", () => {

  it("supports switching from theme submissions to theme shortlist phase", () => {
    eventEditPo.visit({ eventName: EVENT_NAME_SUBMISSIONS_OPEN, page: "edit#state" });
    eventEditPo.themeVotingStatusRadio("shortlist").click();
  });

});
