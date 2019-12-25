
import * as site from "../support/page-objects";

describe("API", () => {

  it("should trigger no errors when accessing endpoints", () => {
    cy.fixture("api-list.json").then(site.requestAllURLs);
  });

});
