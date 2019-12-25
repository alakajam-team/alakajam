import * as site from "./page-objects";

Cypress.Commands.add("loginAs", (username) => {
  cy.clearCookies();
  site.login.visit();
  site.login.name.type(username);
  site.login.password.type(username); // For all e2e tests, passwords are set as the username
  site.login.form.submit();
});

Cypress.Commands.add("backupDB", () => {
  site.adminDev.visit();
  site.adminDev.backupButton.click();
});

Cypress.Commands.add("restoreDB", () => {
  site.adminDev.visit();
  site.adminDev.restoreButton.click();
});
