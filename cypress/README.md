## Cypress tests

This folder contains regression tests written using Cypress.

### Launch

1. Build the client assets: `npm run build:css && npm run build:client`
2. Run `npm run start:e2e` in a first terminal, to launch the end-to-end server (will use a special database)
3. Run `npm run cypress` in a second terminal
4. A window will open, letting you run the desired spec

To run all specs headlessly instead, use `npm run test:e2e` (builds the assets, starts the server and runs Cypress).

The e2e website can be reached directly at http://localhost:8001.  
You can interact with it to add any data needed to run tests.
