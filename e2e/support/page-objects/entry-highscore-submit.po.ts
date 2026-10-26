import { Page } from "@playwright/test";

export default class EntrySubmitScorePO {

  public constructor(private readonly page: Page) {
  }

  public async visit({ eventName, entryId }: { eventName: string; entryId: number | string }) {
    await this.page.goto(`/${eventName}/${entryId}/test-entry/submit-score`);
  }

  public get scoreField() {
    return this.page.locator("input[name=score]");
  }

  public get scoreMinutesField() {
    return this.page.locator("input[name=score-mn]");
  }

  public get scoreSecondsField() {
    return this.page.locator("input[name=score-s]");
  }

  public get scoreMillisecondsField() {
    return this.page.locator("input[name=score-ms]");
  }

  /**
   * Time fields are typed key by key, as their zero-padding logic relies on keyboard events.
   */
  public async typeTimeScore(minutes: string, seconds: string, milliseconds: string) {
    for (const [field, value] of [
      [this.scoreMinutesField, minutes],
      [this.scoreSecondsField, seconds],
      [this.scoreMillisecondsField, milliseconds]
    ] as const) {
      await field.press("ControlOrMeta+a");
      await field.pressSequentially(value);
    }
  }

  public get proofPictureField() {
    return this.page.locator("input[type=file][name=upload]");
  }

  public get saveButton() {
    return this.page.locator(".btn-primary");
  }

  public get deleteButton() {
    return this.page.locator("input[name=delete]");
  }

}

