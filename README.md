<img src="https://raw.githubusercontent.com/mkalam-alami/alakajam/master/static/images/logo.png" width="250" />

[![CircleCI](https://circleci.com/gh/alakajam-team/alakajam/tree/master.svg?style=svg)](https://circleci.com/gh/alakajam-team/alakajam/tree/master)

## Initial setup

Requirement: NodeJS 7.6+

1. `npm install --no-optional` (*)
2. `npm run start`
3. Browse to `http://localhost:8000`
4. You can login as `administrator`/`administrator`

For better performance, consider editing `config.js` to set up a PostgreSQL database.  
See [the wiki](https://github.com/alakajam-team/alakajam/wiki) for additional documentation.

> (*) If `npm install --no-optional` failed to install `sqlite3`, retry with flag `--build-from-source`.

## Available commands

### Recommended for development

* `npm run start` Launches the server for development. Every TypeScript change will trigger a server restart. (based on ts-node-dev)
* `npm run start:refresh` Alternative that also refreshes the browser automatically after editing templates/CSS/client-side scripts. (based on tsc + browser-refresh)
* `npm run start:debug` Launches the server in debug mode. Prefer using the embedded debugger of your code editor (see example for VSCode further below).
* `npm run lint` Checks your code for errors, and fixes the most obvious ones. Run `githooks/install.sh` to trigger validation automatically before committing.

### Automated tests

* `npm run start:e2e` Launches the server with a special database for end-to-end testing. More in the Cypress folder readme.
* `npm run test` Runs all unit + end to end tests.
* `npm run test:unit` Runs all unit tests. (based on mocha + chai)
* `npm run test:e2e` Runs all end-to-end tests. (based on cypress) 
* `npm run cypress` Launches Cypress for end-to-end test development.

### JavaScript build

* `npm run deployment:build` Builds the TypeScript server.
* `npm run deployment:build-watch` Builds the TypeScript server and watches for changes.
* `npm run deployment:start` Starts the TypeScript server. Needs to be built first.

### Other tools

* `npm run migrate:latest` Migrate database to latest version. Useful for migration development. (based on knex)
* `npm run migrate:rollback` Cancel latest database migration. Useful for migration development.
* `npm run migrate:currentVersion` Display current database version.
* `npm run docs` Generates the code documentation. (based on typedoc)

## How do I...

#### ...Debug the code with VSCode

Put this in `.vscode/launch.json`:

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Alakajam!",
      "type": "node",
      "request": "launch",
      "args": ["${workspaceFolder}\\server\\index.ts"],
      "runtimeArgs": ["--nolazy", "-r", "ts-node/register", "-r", "tsconfig-paths/register"],
      "sourceMaps": true,
      "cwd": "${workspaceRoot}",
      "protocol": "inspector",
      "outputCapture": "std"
    }
  ]
}
```

#### ...Reset the data

1. Delete the `data/` folder.
2. If using PostgreSQL, empty your database (example: `drop schema public cascade; create schema public;`).

#### ...Enable picture resizing

Run `npm install` without the `--no-optional` flag to try and set up the `sharp` dependency. If it fails to install (especially on Windows), follow the instructions to install the [sharp dependencies](http://sharp.dimens.io/en/stable/install/), then try `npm install` again.
