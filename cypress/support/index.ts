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

Cypress.Commands.add("select2Dropdown", { prevSubject: true }, (subject, contents) => {
  chooseSelect2Option(subject, contents, () => {
    cy.get(".select2-dropdown input")
      .type(contents, { force: true });
  });
});

Cypress.Commands.add("select2Search", { prevSubject: true }, (subject, contents) => {
  chooseSelect2Option(subject, contents, () => {
    cy.get(subject)
      .parent()
      .find(".select2-search__field")
      .type(contents, { force: true });
  });
});

function chooseSelect2Option(subject: any, contents: any, typingFunction: () => void) {
  cy.get(subject)
    .parent()
    .find("span.select2")
    .click();
  typingFunction();
  cy.get(".select2-results__option")
    .should(($el) => {
      expect($el.text().search(new RegExp(contents, 'i')),
        `could not find select2 option containing '${contents}'`
      ).to.be.greaterThan(-1);
    });
  cy.get(".select2-results__option")
    .first()
    .click();
}