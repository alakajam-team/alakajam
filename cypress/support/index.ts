Cypress.Commands.add("login", (username = "administrator", password = "administrator") => {
  cy.visit("/login");
  cy.get("#name").type(username);
  cy.get("#password").type(password);
  cy.get("form").submit();
});

Cypress.Commands.add("backupDB", () => {
  cy.visit("/admin/dev");
  cy.get("input[name=backup]").click();
});

Cypress.Commands.add("restoreDB", () => {
  cy.visit("/admin/dev");
  cy.get("input[name=restore]").click();
});
