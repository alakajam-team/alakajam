import po from "../support/page-objects";

describe("Registration page", () => {

    const { register, dashboard } = po;

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

});
