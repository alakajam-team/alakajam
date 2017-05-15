# WeJam!

> Current progress: You can browse events and entries, register and submit your own. Plenty of security holes, no admin UI.

## Setup

Requirement: NodeJS 7.6+

* `npm install`
* `node wejam.js`
* Browse to `http://localhost:8000`

There is a default admin user (`administrator`/`administrator`).

### Dev tools

Prerequisite: `npm install -g standard browser-refresh node-inspector jsdoc mocha`

* `npm run-script docs`: Generates the JS documentation in the `docs/` folder.
* `browser-refresh wejam.js`: Launches the app, and makes the server and browser refresh when needed upon file changes.
* `node-debug we-jam.js`: Launches the app in debug mode.
* `standard`: Validates the code style.
* `mocha tests/`: Runs unit tests.

Please run `githooks/install.sh` to install useful Git hooks in your clone.

See also [the wiki](https://github.com/mkalam-alami/we-jam/wiki) for additional developer documentation.
