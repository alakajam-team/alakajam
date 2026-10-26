import { Page } from "@playwright/test";
import { CodeMirror } from "../components/code-mirror";

export default class AdminSettingsPO {

  public constructor(private readonly page: Page) {
  }

  public async visit(options: { edit?: string } = {}) {
    await this.page.goto("/admin/settings" + (options.edit ? `?edit=${options.edit}` : ""));
  }

  /**
   * Value of the edited setting. Text settings are turned into a code editor, just like JSON ones.
   */
  public get valueEditor() {
    return new CodeMirror(this.page);
  }

  public get saveButton() {
    return this.page.locator("form .btn-primary");
  }

  public settingRow(key: string) {
    return this.page.locator("tr", { hasText: key });
  }

}
