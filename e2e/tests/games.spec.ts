import { clickAndWaitForLoad, loginAs } from "../support/commands";
import { USER_DUMBLEDORE } from "../support/data";
import { expect, test } from "../support/test";

test.describe("Games page", () => {

  test.beforeEach(async ({ gamesPo }) => {
    await gamesPo.visit();
  });

  test("lists games made during an event", async ({ gamesPo }) => {
    await gamesPo.eventSelect.choose("results out");
    await clickAndWaitForLoad(gamesPo.applyButton);

    await expect(gamesPo.gamesList).toContainText("Game search test #1");
  });

  test("lists games made for an external event", async ({ gamesPo }) => {
    await gamesPo.eventSelect.choose("external");
    await clickAndWaitForLoad(gamesPo.applyButton);

    await expect(gamesPo.gamesList).toContainText("Game search test #2");
  });

  test("lists games for a user", async ({ gamesPo }) => {
    await gamesPo.userSelect2Dropdown.choose("Administrator");
    await clickAndWaitForLoad(gamesPo.applyButton);

    await expect(gamesPo.title).toContainText("made by Administrator");
    await expect(gamesPo.gamesList).toContainText("Administrator");
  });

  test("lists games searched by title", async ({ gamesPo }) => {
    await gamesPo.titleField.fill("Game search test #1");
    await clickAndWaitForLoad(gamesPo.applyButton);

    await expect(gamesPo.gamesList).toContainText("Game search test #1");
  });

  test("lists games by platform", async ({ gamesPo }) => {
    await gamesPo.platformSelect.choose("Linux");
    await clickAndWaitForLoad(gamesPo.applyButton);

    await expect(gamesPo.gamesList).toContainText("Game search test #1");
  });

  test("lists games by tag", async ({ gamesPo }) => {
    await gamesPo.tagSelect.choose("platformer");
    await clickAndWaitForLoad(gamesPo.applyButton);

    await expect(gamesPo.gamesList).toContainText("Game search test #1");
  });

  test("lists games with high score support", async ({ gamesPo }) => {
    await gamesPo.highScoreSupportCheckbox.click();
    await clickAndWaitForLoad(gamesPo.applyButton);

    await expect(gamesPo.gamesList).toContainText("Game search test #1");
  });

  test("supports complex searches", async ({ page, gamesPo }) => {
    await loginAs(page, USER_DUMBLEDORE);
    await gamesPo.visit();

    await gamesPo.eventSelect.choose("results out");
    await gamesPo.titleField.fill("Game search test #1");
    await gamesPo.userSelect2Dropdown.choose("Administrator");
    await gamesPo.platformSelect.choose("Linux");
    await gamesPo.tagSelect.choose("platformer");
    await gamesPo.hideReviewedCheckbox.click();
    await gamesPo.highScoreSupportCheckbox.click();
    await clickAndWaitForLoad(gamesPo.applyButton);

    await expect(gamesPo.gamesList).toContainText("Game search test #1");
  });

});
