import site from "..";

class DashboardSettingsPO {

    visit() {
        cy.visit(`/dashboard/settings`);
    }

    get alert() {
        return cy.get(".alert");
    }

    get displayNameField() {
        return cy.get("input[name=title]");
    }

    get emailField() {
        return cy.get("input[name=email]");
    }

    get timezoneSelect2Dropdown() {
        return cy.get("select[name=timezone]");
    }

    get websiteField() {
        return cy.get("input[name=website]");
    }

    get twitterField() {
        return cy.get("input[name=twitter]");
    }

    get bioEditor() {
        return site.getEditor();
    }

    get saveButton() {
        return cy.get(".btn-primary").first();
    }

    get deleteAccountButton() {
        cy.acceptFutureConfirms();
        return cy.get(".btn-danger");
    }

}

export default new DashboardSettingsPO();
