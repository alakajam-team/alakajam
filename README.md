<img src="https://raw.githubusercontent.com/alakajam-team/alakajam/master/static/images/logo.png" width="250" />

## Initial setup

Requirement: NodeJS 22 LTS or newer

1. `npm install`
2. `npm run dev`
3. Browse to `http://localhost:8000`
4. You can login as `administrator`/`administrator`

`npm run dev` runs the server (restarted on changes by nodemon), and rebuilds the client scripts (Vite) and styles (Sass) as you edit them. The browser reloads automatically on changes (CSS changes are applied without a reload); this can be disabled with `DEBUG_REFRESH_BROWSER` in `config.js`.

`npm start` only runs the server, and expects the client assets to be built already (`npm run build:css && npm run build:client`).

Tips:

* If npm fails to install `sqlite3` on Windows, run `npm i -g --production windows-build-tools` and retry. You may need to upgrade NodeJS to a recent version.
* For better performance, consider editing `config.js` to set up a PostgreSQL database.

**See [the wiki](https://github.com/alakajam-team/alakajam/wiki) for additional documentation.**

## How do I...

#### ...Debug the server with VSCode

Either run `npm run start:debug` and attach the debugger (the server waits for it before starting), or put this in `.vscode/launch.json`. In both cases, build the client assets first (`npm run build:css && npm run build:client`), or keep them up to date with `npm run dev:client` and `npm run build:css -- --watch`.

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Alakajam!",
      "type": "node",
      "request": "launch",
      "args": ["${workspaceFolder}/server/index.ts"],
      "runtimeArgs": ["-r", "@swc-node/register", "-r", "tsconfig-paths/register"],
      "sourceMaps": true,
      "cwd": "${workspaceRoot}",
      "outputCapture": "std"
    }
  ]
}
```

#### ...Reset the data

1. Stop the server and delete the `data/` folder.
2. If using PostgreSQL, also empty your database (example: `drop schema public cascade; create schema public;`).

#### ...Enable picture resizing

Picture resizing relies on the optional `sharp` dependency. If it fails to install (especially on Windows), `npm install` carries on without it: follow the instructions to install the [sharp dependencies](https://sharp.pixelplumbing.com/en/stable/install/), then try `npm install` again.

Note: don't use `npm install --no-optional`, as it would also skip the native binaries needed by Vite and SWC.

#### ...Run only one unit test

Unit tests use [Vitest](https://vitest.dev/). `npm test` runs them in watch mode, `npm run test:unit:ci` runs them once. To run only some tests, pass a file name filter. For instance:

```bash
npx vitest run user.service
```
