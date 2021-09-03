import { USER_DUMBLEDORE } from "../support/data";
import dashboardPo from "../support/page-objects/dashboard.po";
import loginPo from "../support/page-objects/login.po";
import registerPo from "../support/page-objects/register.po";
import userProfilePo from "../support/page-objects/user-profile.po";

describe("Account management", () => {

  beforeEach(() => {
    cy.restoreDB();
  });

  after(() => {
    cy.restoreDB();
  });

  it("supports registering, deleting a new account", () => {
    registerPo.visit();

    registerPo.name.type("vivi");
    registerPo.emailField.type("vivi@example.com");
    registerPo.password.type("ffixrules");
    registerPo.passwordBis.type("ffixrules");
    registerPo.timezoneSelect2Dropdown.select2Dropdown("antarctica");
    registerPo.termsAndConditions.click();
    registerPo.rememberMe.click();
    registerPo.submit.click();

    dashboardPo.settings.visit();
    dashboardPo.settings.deleteAccountButton.click();
  });

  it("supports changing our own user settings", () => {
    cy.loginAs(USER_DUMBLEDORE);
    dashboardPo.settings.visit();

    dashboardPo.settings.displayNameField.clear().type("WingardiumLeviosa");
    dashboardPo.settings.bioEditor.clearEditor().typeInEditor("magicStick.spawn('JAM_GAME')");
    dashboardPo.settings.saveButton.click();
    dashboardPo.sidebarAvatar.click();

    userProfilePo.userDisplayName.should("contain.text", "WingardiumLeviosa");
    userProfilePo.userBio.should("contain.text", "magicStick.spawn('JAM_GAME')");
  });

  it("supports changing our own password", () => {
    cy.loginAs(USER_DUMBLEDORE);
    dashboardPo.changePassword.visit();

    dashboardPo.changePassword.currentPasswordField.type(USER_DUMBLEDORE);
    dashboardPo.changePassword.newPasswordField.type("123456");
    dashboardPo.changePassword.newPasswordBisField.type("123456");
    dashboardPo.changePassword.saveButton.click();

    cy.logout();
    loginPo.nameField.type(USER_DUMBLEDORE);
    loginPo.passwordField.type("123456");
    loginPo.submitButton.click();

    dashboardPo.changePassword.visit();
  });

});
