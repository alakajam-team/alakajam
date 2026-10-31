# Useful links

* Font Awesome icons https://fontawesome.com/v5/search
* Bootstrap
  * General https://getbootstrap.com/docs/4.1/getting-started/introduction/
  * CSS utilities https://getbootstrap.com/docs/4.1/utilities/flex/

## Blocked NPM versions

* Bookshelf

1.X has a blocking bug for us: https://github.com/alakajam-team/alakajam/issues/478  
Also forces Knex to a compatible version.  
Easiest resolution would be to contribute the fix to Bookshelf ourselves.  

```
Package                                  Current   Wanted   Latest  Location
@types/bookshelf                          0.13.3   0.13.3    1.1.1  alakajam
bookshelf                                 0.15.2   0.15.2    1.2.0  alakajam
knex                                      0.17.6   0.17.6  0.21.12  alakajam
```

* Bootstrap

Stays on 4.x (the markup, jQuery plugins and theme packages all target it). Upgrading is a separate migration.

* TypeORM

Used at runtime alongside Bookshelf (entities, `server/core/db-typeorm.ts`). Must be kept.

## Non-obvious dependencies

* `vite`, `@rollup/plugin-inject`, `sass`, `typescript`, `ts-node`, `copy`, `@types/*` and the client-side libraries bundled by Vite or copied by Sass: build-time only, so they live in `devDependencies`. `deployment/upgrade.sh` installs them to build, then runs `npm prune --omit=dev`.
* `sqlite3` and `pg`: database drivers picked at runtime through `DB_TYPE`, both stay in `dependencies`.
* `@babel/plugin-proposal-optional-chaining`: used at runtime by jsx-pistols to compile the server templates (`server/core/middleware.ts`).
* `chokidar`: file watching for the Sass build (`server/scripts/sass.ts`) and the dev live reload (`server/core/live-reload.ts`), imported by server code so it is a runtime dependency.
* `@swc-node/register`, `@swc/core`, `nodemon`, `tsconfig-paths`: dev server (`npm start`, see `nodemon.json`).
* `unplugin-swc`: lets Vitest emit the decorator metadata required by TypeORM entities.
