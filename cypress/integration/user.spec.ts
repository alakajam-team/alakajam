import { USER_DUMBLEDORE } from "../support/data";
import po from "../support/page-objects";

describe("Account management", () => {

    const { login, register, dashboard, userProfile } = po;

    beforeEach(() => {
      cy.restoreDB();
    });

    afterEach(() => {
      cy.restoreDB();
    });

    it("supports registering, deleting a new account", () => {
        register.visit();

        register.name.type("vivi");
        register.emailField.type("vivi@example.com");
        register.password.type("ffixrules");
        register.passwordBis.type("ffixrules");
        register.timezoneSelect2Dropdown.select2Dropdown("antarctica");
        register.rememberMe.click();
        register.captchaAreYouHuman.type("yes"); // ( ͡° ͜ʖ ͡°)
        register.submit.click();

        dashboard.settings.visit();
        dashboard.settings.deleteAccountButton.click();
    });

    it("supports changing our own user settings", () => {
        cy.loginAs(USER_DUMBLEDORE);
        dashboard.settings.visit();

        dashboard.settings.displayNameField.clear().type("WingardiumLeviosa");
        dashboard.settings.bioEditor.clearEditor().typeInEditor("magicStick.spawn('JAM_GAME')");
        dashboard.settings.saveButton.click();
        dashboard.sidebarAvatar.click();

        userProfile.userDisplayName.should("contain.text", "WingardiumLeviosa");
        userProfile.userBio.should("contain.text", "magicStick.spawn('JAM_GAME')");
    });

    it("supports changing our own password", () => {
        cy.loginAs(USER_DUMBLEDORE);
        dashboard.changePassword.visit();

        dashboard.changePassword.currentPasswordField.type(USER_DUMBLEDORE);
        dashboard.changePassword.newPasswordField.type("123456");
        dashboard.changePassword.newPasswordBisField.type("123456");
        dashboard.changePassword.saveButton.click();

        cy.logout();
        login.nameField.type(USER_DUMBLEDORE);
        login.passwordField.type("123456");
        login.submitButton.click();

        dashboard.changePassword.visit();
    });

});
