class RegisterPO {

  public visit() {
    cy.visit("/register");
  }

  public get alert() {
    return cy.get(".alert");
  }

  public get name() {
    return cy.get("#name");
  }

  public get emailField() {
    return cy.get("input[name=email]");
  }

  public get timezoneSelect2Dropdown() {
    return cy.get("select[name=timezone]");
  }

  public get password() {
    return cy.get("input[name=password]");
  }

  public get passwordBis() {
    return cy.get("input[name=password-bis]");
  }

  public get captchaAreYouHuman() {
    return cy.get("input[name=captcha]");
  }

  public get rememberMe() {
    return cy.get("input[type=checkbox]");
  }

  public get submit() {
    return cy.get(".btn-primary");
  }

}

export default new RegisterPO();
