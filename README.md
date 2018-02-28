![Alakajam!](https://raw.githubusercontent.com/mkalam-alami/alakajam/master/static/images/logo.png)

## Initial setup

Requirement: NodeJS 7.6+

* `npm install`
* `node server.js`
* Browse to `http://localhost:8000`

There is a default admin user (`administrator`/`administrator`).

> NB. If `npm install` failed to install `sqlite3`, retry with flag `--build-from-source`. If it failed to install `sharp`, it's okay as it's optional (see "Enable picture resizing" below if you really want it).

## Developer tools

Prerequisite: `npm install -g knex standard browser-refresh node-inspector jsdoc mocha`

### Recommended

* `browser-refresh server.js`: Launches the app, and makes the server and browser refresh when needed upon file changes.
* `standard`: Validates the code style. Run `githooks/install.sh` to trigger validation automatically before committing.

### Other

* `node-debug server.js`: Launches the app in debug mode.
* `npm run-script docs`: Generates the JS documentation in the `docs/` folder.
* `mocha tests/`: Runs unit tests.
* `DEBUG=express:*`: Enables debugging of routes & performance (must be set before launching the server)

See also [the wiki](https://github.com/mkalam-alami/wejam/wiki) for additional developer documentation.

## How do I...

#### ...Reset the data

* With SQLite, all you have to do is delete the `data/` folder.
* PostgreSQL requires you additionally to empty your database.

#### ...Enable picture resizing

If the `sharp` dependency failed to install in the initial setup, your picture uploads won't be resized. If you want to fix that:

* Follow the instructions to install the [sharp dependencies](http://sharp.dimens.io/en/stable/install/)
* Run `npm install` again
