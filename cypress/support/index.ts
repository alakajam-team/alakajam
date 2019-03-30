Cypress.Commands.add("login", (username, password) => {
  cy.visit("/login");
  cy.get("#name").type(username);
  cy.get("#password").type(password);
  cy.get("form").submit();
});
