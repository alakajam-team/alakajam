![Alakajam!](https://raw.githubusercontent.com/mkalam-alami/alakajam/master/static/images/logo.png)

## Initial setup

Requirement: NodeJS 7.6+

* `npm install --no-optional`
* `node server.js`
* Browse to `http://localhost:8000`

There is a default admin user (`administrator`/`administrator`).

> NB. If `npm install --no-optional` failed to install `sqlite3`, retry with flag `--build-from-source`.

## Developer tools

Prerequisites: `npm install -g knex standard browser-refresh node-inspector jsdoc mocha`

See also [the wiki](https://github.com/alakajam-team/alakajam/wiki) for additional developer documentation.

### Recommended

* `browser-refresh server.js`: Launches the app, and makes the server and browser refresh when needed upon file changes.
* `standard`: Validates the code style. Run `githooks/install.sh` to trigger validation automatically before committing.

### Other

* `node-debug server.js`: Launches the app in debug mode.
* `npm run-script docs`: Generates the JS documentation in the `docs/` folder.
* `mocha tests/`: Runs unit tests.
* `DEBUG=express:*`: Enables debugging of routes and performance (must be set before launching the server).

## How do I...

#### ...Reset the data

* With SQLite, all you have to do is delete the `data/` folder.
* PostgreSQL requires you additionally to empty your database.

#### ...Enable picture resizing

Run `npm install` without the `--no-optional` flag to try and set up the `sharp` dependency. If it fails to install (especially on Windows), follow the instructions to install the [sharp dependencies](http://sharp.dimens.io/en/stable/install/), then try `npm install` again.
