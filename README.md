<img src="https://raw.githubusercontent.com/alakajam-team/alakajam/master/static/images/logo.png" width="250" />

[![CircleCI](https://circleci.com/gh/alakajam-team/alakajam/tree/master.svg?style=svg)](https://circleci.com/gh/alakajam-team/alakajam/tree/master)

## Initial setup

Requirement: NodeJS 14

1. `npm install --no-optional`
2. `npm start`
3. Browse to `http://localhost:8000`
4. You can login as `administrator`/`administrator`

Tips:

* If npm fails to install `sqlite3` on Windows, run `npm i -g --production windows-build-tools` and retry. You may need to upgrade NodeJS to a recent version.
* For better performance, consider editing `config.js` to set up a PostgreSQL database.

**See [the wiki](https://github.com/alakajam-team/alakajam/wiki) for additional documentation.**

## How do I...

#### ...Debug the server with VSCode

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
      "runtimeArgs": ["--nolazy", "-r", "ts-node/register/transpile-only", "-r", "tsconfig-paths/register"],
      "sourceMaps": true,
      "cwd": "${workspaceRoot}",
      "protocol": "inspector",
      "outputCapture": "std"
    }
  ]
}
```

#### ...Reset the data

1. Stop the server and delete the `data/` folder.
2. If using PostgreSQL, also empty your database (example: `drop schema public cascade; create schema public;`).

#### ...Enable picture resizing

Run `npm install` without the `--no-optional` flag to try and set up the `sharp` dependency. If it fails to install (especially on Windows), follow the instructions to install the [sharp dependencies](https://sharp.pixelplumbing.com/en/stable/install/), then try `npm install` again.

#### ...Run only one unit test

Run only partial tests by appending the required file as an argument. For instance:

```bash
npm run test:unit -- user.service
```
