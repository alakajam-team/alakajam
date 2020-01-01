declare namespace Cypress {
  interface Chainable {
    restoreDB: () => Chainable;
    loginAs: (username: string, password?: string) => Chainable;
    logout: () => Chainable;
    clearEditor: () => Chainable;
    typeInEditor: (contents: string) => Chainable;
    acceptFutureConfirms: () => Chainable;
    select2Dropdown: (contents: string) => Chainable;
    select2Search: (contents: string) => Chainable;
    dropFile: (fixture?: string, contentType?: string) => Chainable;
    scrollElementsToScreenCenter: () => Chainable;
  }
}
