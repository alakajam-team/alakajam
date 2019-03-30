function navigatePageList(fixtureName) {
  cy.fixture(fixtureName).then((pages) => {
    Object.keys(pages).forEach((pageName) => {
      const page = pages[pageName];
      cy.visit(page);
    });
  });
}

describe("Navigation", () => {

  it("should trigger no errors as an administrator", () => {
    cy.login("administrator", "administrator");

    navigatePageList("page-list-admin.json");
  });

  it("should trigger no errors as a simple user", () => {
    cy.login("dumbledore", "dumbledore");

    navigatePageList("page-list-user.json");
    navigatePageList("page-list-common.json");
  });

  it("should trigger no errors as an anonymous user", () => {
    navigatePageList("page-list-common.json");
  });

});
