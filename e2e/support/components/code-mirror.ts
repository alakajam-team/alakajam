import { Locator, Page } from "@playwright/test";

/**
 * Markdown editor (EasyMDE, built upon CodeMirror)
 */
export class CodeMirror {

  private readonly textarea: Locator;

  public constructor(page: Page, index = 0) {
    this.textarea = page.locator(".CodeMirror textarea").nth(index);
  }

  public async type(contents: string) {
    await this.textarea.pressSequentially(contents);
  }

  public async clear() {
    await this.textarea.press("ControlOrMeta+a");
    await this.textarea.press("Backspace");
  }

}
