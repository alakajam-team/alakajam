describe("Anonymous users", () => {
  it("can see the welcome block in the landing page", () => {
    cy.visit("/");
    cy.contains("Welcome to Alakajam!");
  });
});
