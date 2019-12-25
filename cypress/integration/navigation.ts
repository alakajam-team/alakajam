import { USER_ADMINISTRATOR, USER_DUMBLEDORE } from "../support/data";

function visitAllPages(pages: Record<string, string>) {
  Object.keys(pages).forEach((pageName) => {
      cy.visit(pages[pageName]);
  });
}

describe("Navigation", () => {

  it("should trigger no errors as an administrator", () => {
    cy.loginAs(USER_ADMINISTRATOR);
    cy.fixture("page-list-admin.json").then(visitAllPages);
  });

  it("should trigger no errors as a simple user", () => {
    cy.loginAs(USER_DUMBLEDORE);
    cy.fixture("page-list-user.json").then(visitAllPages);
    cy.fixture("page-list-common.json").then(visitAllPages);
  });

  it("should trigger no errors as an anonymous user", () => {
    cy.fixture("page-list-common.json").then(visitAllPages);
  });

});
