import "cypress-file-upload";
import { DEFAULT_PICTURE } from "./data";
import loginPo from "./page-objects/login.po";

Cypress.Commands.add("loginAs", (username: string, password?: string) => {
  cy.clearCookies();
  loginPo.visit();
  loginPo.nameField.type(username);
  loginPo.passwordField.type(password || username); // For all e2e tests, default passwords are set as the username
  loginPo.rememberMeField.click(); // Make sessions persist after DB restorations
  loginPo.submitButton.click();
});

Cypress.Commands.add("logout", () => {
  cy.clearCookies();
  loginPo.visit();
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
      expect($el.text().search(new RegExp(contents, "i")),
        `could not find select2 option containing '${contents}'`
      ).to.be.greaterThan(-1);
    });
  cy.get(".select2-results__option")
    .first()
    .click();
}

Cypress.Commands.add("dropFile", { prevSubject: true }, (subject, fixture, mimeType) => {
  const fileName = fixture || DEFAULT_PICTURE;
  cy.fixture(fileName).then((fileContent) => {
    cy.get(subject).upload({
      fileContent,
      fileName,
      mimeType: mimeType || "image/png"
    });
  });
});

function createFileDropEvent(file: File) {
  return {
    dataTransfer: {
      files: [file]
    }
  };
}

Cypress.Commands.add("scrollElementsToScreenCenter", () => {
  Cypress.on('scrolled', $el => {
    $el.get(0).scrollIntoView({
      block: 'center',
      inline: 'center'
    });
  });
});

Cypress.Commands.add("getEditor", { prevSubject: true }, (subject, index) => {
  return cy.get(".CodeMirror textarea").eq(index || 0);
});
