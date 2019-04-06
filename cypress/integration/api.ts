function navigateEndpointList(fixtureName) {
  cy.fixture(fixtureName).then((pages) => {
    Object.keys(pages).forEach((pageName) => {
      const page = pages[pageName];
      cy.request(page);
    });
  });
}

describe("API", () => {

  it("should trigger no errors when accessing endpoints", () => {
    navigateEndpointList("api-list.json");
  });

});
