# Alakajam! *(previously WeJam!)*

> Current progress: A very early alpha website, with posts half-implemented, no events administration, awful security, and no voting system.

## Initial setup

Requirement: NodeJS 7.6+

* `npm install`
* `node server.js`
* Browse to `http://localhost:8000`

There is a default admin user (`administrator`/`administrator`).

## Developer tools

Prerequisite: `npm install -g standard browser-refresh node-inspector jsdoc mocha`

### Recommended

* `browser-refresh server.js`: Launches the app, and makes the server and browser refresh when needed upon file changes.
* `standard`: Validates the code style. Run `githooks/install.sh` to trigger validation automatically before committing.

### Other

* `node-debug server.js`: Launches the app in debug mode.
* `npm run-script docs`: Generates the JS documentation in the `docs/` folder.
* `mocha tests/`: Runs unit tests.

See also [the wiki](https://github.com/mkalam-alami/wejam/wiki) for additional developer documentation.

#### Enabling picture resizing

If the `sharp` dependency failed to install in the initial setup, your picture uploads won't be resized. If you want to fix that:

* Follow the instructions to install the [sharp dependencies](http://sharp.dimens.io/en/stable/install/)
* Run `nom install` again
