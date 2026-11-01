# Dependency upgrade plan

Read `DEPENDENCIES.md` first for the hard constraints.

## Ground rules

- **Out of scope / must keep:** Bootstrap stays on 4.x (so jQuery stays on 3.x), TypeORM stays (upgrade only), Bookshelf runs on our patched fork (issue #478), which caps Knex at 0.21.x; Knex 1+ stays blocked.
- **One batch = one commit**, pushed to the working branch, never mixed with refactors or feature removals.
- **Tests first for risky batches:** write characterization tests against the *current* version, confirm they pass, then upgrade (this is how luxon was done: `server/core/formats.spec.ts`).
- Prefer removing a dependency over adapting to a new API when Node covers it (done for `mkdirp`, `find-up`).
- Libraries without types hide breakage from `tsc` (html-to-text's removed `fromString` slipped through). Add `@types/*` when the library has no bundled types, and smoke-test at runtime.
- Node >= 22.12, CommonJS output (`module: commonjs`). ESM-only packages load through `require(esm)` (works for `slug` 12 and `chokidar` 5); check each candidate's `engines` before upgrading.

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

### Batch 3b - connect-session-knex (left over from Express 5)
`connect-session-knex` is still 2.1.2: it was not needed for Express 5. 5.x is not blocked by the Knex pin (own `knex@3` dependency, receives our Knex instance in `createSessionStore`, `server/core/middleware.ts`). Check whether its factory API changed, then verify real session reads/writes on SQLite and PostgreSQL (login, logout, alerts across a redirect).

### Batch 4b - client libraries needing visual sign-off
- `flipclock` 0.10 -> 1: full redesign (new DOM, theme CSS and face API: `face: dayCounter(...)`), so `client/scripts/countdown.ts`, the `types.d.ts` declaration and `client/scss/flipclock-custom.scss` must be rewritten and the countdown judged visually (jumbotron on the event pages). Not started.
- `@fortawesome/fontawesome-free` 5 -> 7: icon names and style prefixes changed (`fas/far/fab`); needs a template-wide icon audit. Do last, or skip.
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
- Slug replacement: local helper vs waiting for an ESM server build?
- Should `deployment/upgrade.sh` change (install dev deps, build, prune) be tried on a staging server before the next real deploy?
