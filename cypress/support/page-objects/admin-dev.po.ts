class AdminDevPO {

  public visit() {
    cy.visit("/admin/dev");
  }

  public get alert() {
    return cy.get(".alert");
  }

  public get backupButton() {
    throw new Error("Do not make backups during tests. A backup is already done on server start (see e2e.ts");
  }

  public get restoreButton() {
    return cy.get("input[name=restore]");
  }

}

export default new AdminDevPO();
