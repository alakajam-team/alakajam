class AdminDevPO {

    public visit() {
        cy.visit("/admin/dev");
    }

    get alert() {
        return cy.get(".alert");
    }

    get backupButton() {
        throw new Error("Do not make backups during tests. A backup is already done on server start (see e2e.ts");
    }

    get restoreButton() {
        return cy.get("input[name=restore]");
    }

}

export default new AdminDevPO();
