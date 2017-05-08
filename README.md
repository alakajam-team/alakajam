# WeJam!

> Current progress: Mostly just a skeleton for a generic website. You can browse an event and its entries.

## Setup

Requirement: NodeJS 7.6+

* `npm install`
* `node wejam.js`
* Browse to `http://localhost:8000`

### Dev tools

Prerequisite: `npm install -g standard browser-refresh node-inspector jsdoc`

* `npm run-script docs`: Generates the JS documentation in the `docs/` folder.
* `browser-refresh wejam.js`: Launches the app, and makes the server and browser refresh when needed upon file changes.
* `node-debug we-jam.js`: Launches the app in debug mode.
* `standard`: Validates the code style.
* `npm test`: Runs unit tests.

See also [the wiki](https://github.com/mkalam-alami/we-jam/wiki) for additional developer documentation.
