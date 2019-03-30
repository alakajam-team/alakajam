<img src="https://raw.githubusercontent.com/mkalam-alami/alakajam/master/static/images/logo.png" width="250" />

[![CircleCI](https://circleci.com/gh/alakajam-team/alakajam/tree/typescript.svg?style=svg)](https://circleci.com/gh/alakajam-team/alakajam/tree/typescript)

## Initial setup

Requirement: NodeJS 7.6+

1. `npm install --no-optional` (*)
2. `npm run start:ts`
3. Browse to `http://localhost:8000`
4. You can login as `administrator`/`administrator`

For better performance, consider editing `config.js` to set up a PostgreSQL database.  
See [the wiki](https://github.com/alakajam-team/alakajam/wiki) for additional documentation.

> (*) If `npm install --no-optional` failed to install `sqlite3`, retry with flag `--build-from-source`.

## Available commands

### Recommended

* `npm run start:ts` Launches the server without needing to compile it first. Every TypeScript change will trigger a server restart. (based on ts-node-dev)
* `npm run start:refresh` Alternative that also refreshes the browser automatically after editing templates/CSS/client-side scripts. (based on tsc + browser-refresh)
* `npm run lint` Checks your code for errors, and fixes the most obvious ones.

### Other tools

* `npm run start` Starts the TypeScript server. Needs to be built first.
* `npm run start:debug` Launches the server in debug mode. Needs to be built first. Prefer using the embedded debugger of your code editor (see example for VSCode below).
* `npm run build` Builds the TypeScript server.
* `npm run build:watch` Builds the TypeScript server and watches for changes.
* `npm run test` Runs all unit + end to end tests.
* `npm run test:unit` Runs all unit tests. (based on mocha + chai)
* `npm run test:e2e` Runs all end-to-end tests. (based on cypress) 
* `npm run test:cypress` Launches Cypress for end-to-end test development.
* `npm run migrate:latest` Migrate database to latest version. (based on knex)
* `npm run migrate:rollback` Cancel latest database migration.
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

* With SQLite, all you have to do is delete the `data/` folder.
* PostgreSQL requires you additionally to empty your database.

#### ...Enable picture resizing

Run `npm install` without the `--no-optional` flag to try and set up the `sharp` dependency. If it fails to install (especially on Windows), follow the instructions to install the [sharp dependencies](http://sharp.dimens.io/en/stable/install/), then try `npm install` again.
