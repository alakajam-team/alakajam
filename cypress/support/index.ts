import po from "./page-objects";

Cypress.Commands.add("loginAs", (username) => {
  cy.clearCookies();
  po.login.visit();
  po.login.name.type(username);
  po.login.password.type(username); // For all e2e tests, passwords are set as the username
  po.login.rememberMe.click(); // Make sessions persist after DB restorations
  po.login.form.submit();
});

Cypress.Commands.add("clearEditor", { prevSubject: true }, (subject) => {
  cy.get(subject)
    .type(`{ctrl}a`, { force: true })
    .type(`{backspace}`, { force: true });
});

Cypress.Commands.add("typeInEditor", { prevSubject: true }, (subject, contents) => {
  cy.get(subject).type(contents, { force: true });
});

Cypress.Commands.add("restoreDB", () => {
  cy.request("POST", "/admin/dev", "restore=1");
});

Cypress.Commands.add("acceptFutureConfirms", () => {
  cy.on("window:confirm" as any, () => true);
});


