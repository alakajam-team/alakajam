class AdminDevPO {

    visit() {
        cy.visit("/admin/dev");
    }

    get backupButton() {
        return cy.get("input[name=backup]");
    }

    get restoreButton() {
        return cy.get("input[name=restore]");
    }

}

export default new AdminDevPO();
