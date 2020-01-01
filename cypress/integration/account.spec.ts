import po from "../support/page-objects";
import userProfile from "../support/page-objects/user-profile";
import { USER_DUMBLEDORE } from "../support/data";

describe("Account management", () => {

    const { register, dashboard, userProfile } = po;

    beforeEach(() => {
        cy.restoreDB();
    });

    it("supports registering, deleting a new account", () => {
        register.visit();

        register.name.type("vivi");
        register.emailField.type("vivi@example.com")
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
        dashboard.settings.bioEditor.clearEditor().typeInEditor("magicStick.spawn('JAM_GAME')")
        dashboard.settings.saveButton.click();
        dashboard.sidebarAvatar.click();

        userProfile.userDisplayName.should("contain.text", "WingardiumLeviosa");
        userProfile.userBio.should("contain.text", "magicStick.spawn('JAM_GAME')");
    });

});
