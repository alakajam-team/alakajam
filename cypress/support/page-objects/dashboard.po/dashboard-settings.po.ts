class DashboardSettingsPO {

  public visit() {
    cy.visit("/dashboard/settings");
  }

  public get alert() {
    return cy.get(".alert");
  }

  public get displayNameField() {
    return cy.get("input[name=title]");
  }

  public get emailField() {
    return cy.get("input[name=email]");
  }

  public get timezoneSelect2Dropdown() {
    return cy.get("select[name=timezone]");
  }

  public get websiteField() {
    return cy.get("input[name=website]");
  }

  public get twitterField() {
    return cy.get("input[name=twitter]");
  }

  public get bioEditor() {
    return cy.getEditor();
  }

  public get saveButton() {
    return cy.get(".btn-primary").first();
  }

  public get deleteAccountButton() {
    cy.acceptFutureConfirms();
    return cy.get(".btn-danger");
  }

}

export default new DashboardSettingsPO();
