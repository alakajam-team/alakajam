import { Page } from "@playwright/test";
import { Select2 } from "../components/select2";
import { CodeMirror } from "../components/code-mirror";

export default class EntryEditPO {

  public constructor(private readonly page: Page) {
  }

  public async visit({ eventName, entryId }: { eventName: string; entryId: number | string }) {
    await this.page.goto(`/${eventName}/${entryId}/test-entry/edit`);
  }

  public get titleField() {
    return this.page.locator("input[name=title]");
  }

  public get descriptionField() {
    return this.page.locator("input[name=description]");
  }

  public get divisionButtons() {
    return this.page.locator(".entry__divisions");
  }

  public divisionButton(divisionName: string) {
    return this.divisionButtons.getByText(divisionName, { exact: true });
  }

  public get selectedDivision() {
    return this.page.locator(".entry__divisions .active");
  }

  public get teamMembersSelect2Search() {
    return new Select2(this.page, this.page.locator("select[name=members]"), "search");
  }

  public get graphicsOptout() {
    return this.page.locator("#edit-optouts label").nth(0);
  }

  public get audioOptout() {
    return this.page.locator("#edit-optouts label").nth(1);
  }

  public get linkLabelFields() {
    return this.page.locator(".js-link-label");
  }

  public get linkUrlFields() {
    return this.page.locator(".js-link-url");
  }

  public get linkDeleteButtons() {
    return this.page.locator(".js-remove-link");
  }

  public get addLinkButton() {
    return this.page.locator(".js-add-link");
  }

  public get bodyEditor() {
    return new CodeMirror(this.page);
  }

  public get platformsSelect2Search() {
    return new Select2(this.page, this.page.locator("select[name=platforms]"), "search");
  }

  public get tagsSelect2Search() {
    return new Select2(this.page, this.page.locator("select[name=tags]"), "search");
  }

  public get highScoresOffRadio() {
    return this.page.locator("label[for=enable-high-score-off]");
  }

  public get highScoresOnRadio() {
    return this.page.locator("label[for=enable-high-score-on]");
  }

  public get highScoresInstructionsField() {
    return this.page.locator("textarea[name=high-score-instructions]");
  }

  public get entryDeleteButton() {
    return this.page.locator(".btn-danger");
  }

  public get saveButton() {
    return this.page.locator("input[type=submit]");
  }

}

