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

* @types/node

Still on 14.x, which conflicts with the peer dependencies of Vitest 3.
`.npmrc` sets `legacy-peer-deps=true` so that `npm install` / `npm ci` still work.

## Non-obvious dependencies

* `vite`, `@rollup/plugin-inject`, `sass`, `typescript`, `ts-node`: needed by `npm run build`, which also runs on the production server after a `NODE_ENV=production npm ci` (see `deployment/upgrade.sh`). They must stay in `dependencies`, not `devDependencies`.
* `@babel/plugin-proposal-optional-chaining`: used at runtime by jsx-pistols to compile the server templates (`server/core/middleware.ts`).
* `chokidar`: file watching for the Sass build (`server/scripts/sass.ts`) and the dev live reload (`server/core/live-reload.ts`).
* `@swc-node/register`, `@swc/core`, `nodemon`, `tsconfig-paths`: dev server (`npm start`, see `nodemon.json`).
* `unplugin-swc`: lets Vitest emit the decorator metadata required by TypeORM entities.
