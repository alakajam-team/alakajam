import { Page } from "@playwright/test";
import { Select2 } from "../components/select2";

export default class RegisterPO {

  public constructor(private readonly page: Page) {
  }

  public async visit() {
    await this.page.goto("/register");
  }

  public get alert() {
    return this.page.locator(".alert").filter({ visible: true });
  }

  public get name() {
    return this.page.locator("#name");
  }

  public get emailField() {
    return this.page.locator("input[name=email]");
  }

  public get timezoneSelect2Dropdown() {
    return new Select2(this.page, this.page.locator("select[name=timezone]"), "dropdown");
  }

  public get password() {
    return this.page.locator("input[name=password]");
  }

  public get passwordBis() {
    return this.page.locator("input[name=password-bis]");
  }

  public get termsAndConditions() {
    return this.page.locator("input[name=terms-and-conditions]");
  }

  public get rememberMe() {
    return this.page.locator("input[name=remember-me]");
  }

  public get submit() {
    return this.page.locator(".btn-primary");
  }

}

