# Dependency upgrade plan

Read `DEPENDENCIES.md` first for the hard constraints.

## Ground rules

- **Out of scope / must keep:** Bootstrap stays on 4.x (so jQuery stays on 3.x), TypeORM stays (upgrade only), Bookshelf runs on our patched fork (issue #478), which caps Knex at 0.21.x; Knex 1+ stays blocked.
- **One batch = one commit**, pushed to the working branch, never mixed with refactors or feature removals.
- **Tests first for risky batches:** write characterization tests against the *current* version, confirm they pass, then upgrade (this is how luxon was done: `server/core/formats.spec.ts`).
- Prefer removing a dependency over adapting to a new API when Node covers it (done for `mkdirp`, `find-up`).
- Libraries without types hide breakage from `tsc` (html-to-text's removed `fromString` slipped through). Add `@types/*` when the library has no bundled types, and smoke-test at runtime.
- Node 22, CommonJS output (`module: commonjs`). Check every candidate for ESM-only before upgrading.

## Verification protocol (every batch)

```bash
npm ci --ignore-scripts && npm rebuild sqlite3 sharp   # native modules need an explicit rebuild
npx tsc --noEmit -p tsconfig.json
npx eslint server client e2e playwright.config.ts --quiet   # npm run lint uses --fix
npm run test:unit:ci
npm run build
# boot the compiled server: needs NODE_ENV=production (views are compiled .js), expect HTTP 200 on /
NODE_ENV=production node dist/server/index.js
# dev/source boot: node -r @swc-node/register -r tsconfig-paths/register server/index.ts
npm run test:e2e   # not yet run on this branch: run it before merging, at least once
```

Do not use `pkill -f` with a pattern that appears in your own command line (it kills the shell).

## Remaining batches, lowest risk first

### Batch 1 - test stack
`vitest` 5, `chai` 6, `sinon` 22, then drop `@types/chai` and `@types/sinon` (bundled types in recent majors; verify).
- Check `vite` 8 / `unplugin-swc` compatibility (TypeORM decorator metadata in tests depends on it).
- chai 5+ is ESM-only: confirm it still loads from specs under vitest (it should, vitest handles ESM), and that `e2e/` and any `require` use is unaffected.
- Risk: low for production (dev-only). Done when all 193+ tests pass unchanged.

### Batch 2 - media and markdown
- `sharp` 0.27 -> 0.35: bundled types since 0.32, so drop `@types/sharp`. Review `server/entry/entry-pictures.service.ts` and any `sharp(` use (resize options, `toFile`, metadata). Needs Node >= 18 and new prebuilt binaries: check the production install (`npm ci` then `node -e "require('sharp')"`). README mentions sharp is optional: keep that behavior.
- `showdown` 1.9 -> 2.1 (+ `@types/showdown` 2): output and default options changed. **First** add snapshot-style tests of `forms.markdownToHtml` / `markdownToText` on representative content (headings ids, tables, code, links, line breaks, emoji), then upgrade and review each diff deliberately. User content is stored as markdown, so rendering regressions are visible site-wide.
- `hcaptcha` 0.1 -> 0.2: read the changelog, tiny surface (registration only).
- `reflect-metadata` 0.1 -> 0.2: only if the installed TypeORM 0.2 peer range allows it, else leave.

### Batch 3 - Express 5 (the big one)
`express` 5, `@types/express` 5, `@types/express-serve-static-core` 5, `body-parser` 2 (Express 5 bundles `express.json/urlencoded`: consider dropping the package), `express-slow-down` 3, `connect-session-knex` 5, `express-promise-router` (Express 5 handles rejected promises natively: likely removable), `express-session`, `csurf` (deprecated, no upgrade exists: keep, or plan a replacement separately).
- Before upgrading, add route-level tests (supertest-style against `server/routes.ts` or a minimal app) for: a GET page, a POST with CSRF, session login/logout, multer upload, an error page (404/500 via `error.middleware.ts`), rate limiting.
- Known Express 5 changes to grep for: path syntax (`*` wildcards must be named, optional `?` and regexp routes change; review every route in `server/routes.ts`), `req.query` is a read-only getter and the default query parser is `simple`, `req.body` is `undefined` when no body is parsed (was `{}`), removed `req.param()`, `res.redirect("back")`, `app.del`, `res.json(status, body)` signatures, `req.host`.
- `connect-session-knex` 5 is **not blocked by the Knex pin**: it has no knex peer, it depends on its own `knex@3` copy (2.1.2 already nests knex 1.0.7) and is handed our Knex instance in `createSessionStore` (`server/core/middleware.ts`). Knex is now on 0.21 (see Done); check whether its 5.x API (the `connectSessionKnex(expressSession)` factory may have changed) works with a Knex 0.21 instance; verify against real session reads/writes on SQLite and Postgres.
- Needs the full E2E suite, plus a manual pass on login, uploads and the admin pages.

### Batch 4 - ESM-only and client libraries
- `slug` 4 -> 12 (ESM-only; used in `server/macros/form.macros.tsx` and the client bundle). Options: replace with a small local transliterating helper, or keep 4.x until the server moves to ESM. Pin down current slug output with tests first, since slugs are persisted in URLs.
- `chokidar` 3 -> 6: v4+ removed glob support, and `server/scripts/sass.ts` watches with `**/*.scss` globs; `live-reload.ts` also uses it. Rewrite watchers on folder + extension filters (or `fs.watch` recursive), and check the ESM-only status of the target version.
- `chartist` 0.11 -> 2, `flipclock` 0.10 -> 1: API rewrites, each used in one or two client files. Verify visually (countdown, charts) with Playwright screenshots.
- `@fortawesome/fontawesome-free` 5 -> 7: icon names and style prefixes changed (`fas/far/fab`); needs a template-wide icon audit. Do last in this batch, or skip.
- `@types/jquery` 4 / `jquery` 4: **blocked by Bootstrap 4**.

### Batch 5 - rendering core
`preact` 11 + `jsx-pistols` 0.6 (+ its nested `preact-render-to-string`). All server templates are TSX rendered through jsx-pistols (`server/core/middleware.ts`, babel plugin `@babel/plugin-proposal-optional-chaining`). Highest blast radius in the app: render a representative set of pages before/after and diff the HTML. Check that jsx-pistols 0.6 supports preact 11 before starting; otherwise wait.

### Not planned / blocked
- **Knex 0.21 -> 1+/3, `sqlite3` 6**: blocked by the Bookshelf fork's peer range (`knex <0.22`). Unblocking means widening the fork's range and testing Bookshelf 1.2 against newer Knex, treated as its own project with the migrations suite as the safety net. (Bookshelf 1.x itself and Knex 0.21 are done.)
- **TypeORM 0.2 -> 1.x**: keep the package, but the upgrade is large (DataSource API, decorators, metadata). Separate project, coordinate with the Knex work since both touch the same database.
- **TypeScript 7**: `typescript-eslint` peers stop at `<6.1` and `typedoc` at 6.0.x. Try 5.9 -> 6.0 when tooling supports it; 7 only once typescript-eslint does.
- **Bootstrap 5 / jQuery 4**: out of scope by decision.
- **`@types/node`**: stay on 22 to match the runtime. Bump together with the Node version.

## Open questions for the owner
- Is it acceptable to drop `body-parser` and `express-promise-router` once Express 5 lands?
- Slug replacement: local helper vs waiting for an ESM server build?
- Should `deployment/upgrade.sh` change (install dev deps, build, prune) be tried on a staging server before the next real deploy?
- E2E has not been run on this branch yet; CI will be the first run.
