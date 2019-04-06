describe("Posts", () => {

  before(() => {
    cy.backupDB();
    cy.login();
  });

  afterEach(() => {
    cy.restoreDB();
  });

  it("support writing comments", () => {
    cy.visit("/post/3/comment-testing");
    cy.get("h2").should("contain", "(0)");
    cy.get(".CodeMirror textarea").type("Hello world!", { force: true });
    cy.get("input[name=save]").click();
    cy.get("h2").should("contain", "(1)");
    cy.get(".comment").should("contain", "Hello world!");
  });

});
