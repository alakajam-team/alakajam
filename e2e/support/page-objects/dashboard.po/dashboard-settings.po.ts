import { Page } from "@playwright/test";
import { Select2 } from "../../components/select2";
import { CodeMirror } from "../../components/code-mirror";

export default class DashboardSettingsPO {

  public constructor(private readonly page: Page) {
  }

  public async visit() {
    await this.page.goto("/dashboard/settings");
  }

  public get alert() {
    return this.page.locator(".alert").filter({ visible: true });
  }

  public get displayNameField() {
    return this.page.locator("input[name=title]");
  }

  public get emailField() {
    return this.page.locator("input[name=email]");
  }

  public get timezoneSelect2Dropdown() {
    return new Select2(this.page, this.page.locator("select[name=timezone]"), "dropdown");
  }

  public get websiteField() {
    return this.page.locator("input[name=website]");
  }

  public get twitterField() {
    return this.page.locator("input[name=twitter]");
  }

  public get bioEditor() {
    return new CodeMirror(this.page);
  }

  public get saveButton() {
    return this.page.locator(".btn-primary").first();
  }

  public get deleteAccountButton() {
    return this.page.locator(".btn-danger");
  }

}

