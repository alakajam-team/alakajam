import { Page } from "@playwright/test";

export default class AdminSettingsPO {

  public constructor(private readonly page: Page) {
  }

  public async visit(options: { edit?: string } = {}) {
    await this.page.goto("/admin/settings" + (options.edit ? `?edit=${options.edit}` : ""));
  }

  /**
   * Value of the edited setting, for plain text settings (JSON ones use a code editor)
   */
  public get valueInput() {
    return this.page.locator("textarea[name=value]");
  }

  public get saveButton() {
    return this.page.locator("form .btn-primary");
  }

  public settingRow(key: string) {
    return this.page.locator("tr", { hasText: key });
  }

}
