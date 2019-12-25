import { USER_ADMINISTRATOR, USER_DUMBLEDORE } from "../support/data";
import * as site from "../support/page-objects";

describe("Navigation", () => {

  it("should trigger no errors as an administrator", () => {
    cy.loginAs(USER_ADMINISTRATOR);
    cy.fixture("page-list-admin.json").then(site.visitAllPages);
  });

  it("should trigger no errors as a simple user", () => {
    cy.loginAs(USER_DUMBLEDORE);
    cy.fixture("page-list-user.json").then(site.visitAllPages);
    cy.fixture("page-list-common.json").then(site.visitAllPages);
  });

  it("should trigger no errors as an anonymous user", () => {
    cy.fixture("page-list-common.json").then(site.visitAllPages);
  });

});
