declare namespace Cypress {
  interface Chainable {
    restoreDB: () => Chainable;
    loginAs: (username: string) => Chainable;
    clearEditor: () => Chainable;
    typeInEditor: (contents: string) => Chainable;
    acceptFutureConfirms: () => Chainable;
  }
}
