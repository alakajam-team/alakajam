declare namespace Cypress {
  interface Chainable {
    loginAs: (username: string) => Chainable;
    backupDB: () => Chainable;
    restoreDB: () => Chainable;
  }
}
