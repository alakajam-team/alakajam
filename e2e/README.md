## End-to-end tests

This folder contains regression tests written using [Playwright](https://playwright.dev/).

* `tests/`: the test specs
* `support/`: page objects and helpers. Specs import `test` and `expect` from `support/test.ts`, which provides the page objects as fixtures
* `fixtures/`: static files used by tests
* `e2e.sqlite`, `uploads/`: data of the end-to-end server

### Launch

Build the website first with `npm run build`, then:

* `npm run test:e2e` runs all tests. The end-to-end server (using a special database) is started automatically, or reused if already running.
* `npm run test:e2e:ui` opens the Playwright UI, letting you run the desired spec
* `npm run test:e2e -- entry.spec.ts` runs a single spec

To launch the end-to-end server by hand, run `npm run start:e2e`.
The e2e website can then be reached directly at http://localhost:8001.
You can interact with it to add any data needed to run tests.

After a failure, `npx playwright show-report e2e/playwright-report` shows traces and screenshots.
