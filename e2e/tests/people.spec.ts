import { expect, test } from "../support/test";

test.describe("People page", () => {

  test.beforeEach(async ({ peoplePo }) => {
    await peoplePo.visit();
  });

  test("lists users", async ({ peoplePo }) => {
    await expect(peoplePo.results).toContainText("Administrator");
  });

  test("lets search users by name, then reset the search", async ({ peoplePo }) => {
    await peoplePo.nameField.fill("gandalf");
    await peoplePo.submitForm();
    await expect(peoplePo.results).toContainText("gandalf");
    await expect(peoplePo.results).not.toContainText("Administrator");

    await peoplePo.cancel.click();
    await expect(peoplePo.results).toContainText("Administrator");
  });

  test("lets filter out users without entries", async ({ peoplePo }) => {
    await peoplePo.withEntriesCheckbox.click();
    await peoplePo.submitForm();
    await expect(peoplePo.results).not.toContainText("noentries");
    await expect(peoplePo.results).toContainText("Administrator");
  });

});
