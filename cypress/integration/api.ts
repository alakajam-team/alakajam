function requestAllURLs(pages: Record<string, string>) {
  Object.keys(pages).forEach((pageName) => {
      cy.request(pages[pageName]);
  });
}

describe("API", () => {

  it("should trigger no errors when accessing endpoints", () => {
    cy.fixture("api-list.json").then(requestAllURLs);
  });

});
