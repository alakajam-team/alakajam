# Dependency upgrade plan

Read `DEPENDENCIES.md` first for the hard constraints.

## Ground rules

- **Out of scope / must keep:** Bootstrap stays on 4.x (so jQuery stays on 3.x), TypeORM stays (upgrade only), Bookshelf runs on our patched fork (issue #478), which caps Knex at 0.21.x; Knex 1+ stays blocked.
- **One batch = one commit**, pushed to the working branch, never mixed with refactors or feature removals.
- **Tests first for risky batches:** write characterization tests against the *current* version, confirm they pass, then upgrade (this is how luxon was done: `server/core/formats.spec.ts`).
- Prefer removing a dependency over adapting to a new API when Node covers it (done for `mkdirp`, `find-up`).
- Libraries without types hide breakage from `tsc` (html-to-text's removed `fromString` slipped through). Add `@types/*` when the library has no bundled types, and smoke-test at runtime.
- Node >= 22.12, CommonJS output (`module: commonjs`). ESM-only packages load through `require(esm)` (works for `chokidar` 5); check each candidate's `engines` before upgrading.

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

## Completed batches

- **Slug**: `slug` replaced by a local helper (`server/core/slug.ts`, covered by `slug.spec.ts`). Non-Latin titles now slugify to an empty string (the old library produced base64-like output); the model fallbacks (`unnamed`) already handle it.
- **Batch 3b, connect-session-knex 5**: the factory became the `ConnectSessionKnexStore` class (`tableName`/`cleanupInterval` options); the existing `sessions` table is reused as is. The restore of the SQLite backup now swaps `store.options.knex` (`server/core/db.ts`). Verified on SQLite with the e2e suite (login/logout/alerts); **not tried on PostgreSQL**.
- **Batch 4b, flipclock 1**: `countdown.ts` rewritten on `flipClock`/`elapsedTime` (format `[DD] [hh] [mm] [ss]`, one label per bracket group), bundled by Vite instead of eval'ed. Judged visually against the 0.10 version with screenshots (jumbotron countdown, future and past dates); **a real check on an event page with a configured countdown is still worth doing**.
- **Batch 4b, Font Awesome 7**: every `fa-*` class used in templates resolves in the v7 CSS (aliases for the old v5 names are included) and renders; `fa-external-link` was blank in v5 and now works. Only `dist/client/webfonts` keeps stale v5 files until `dist/` is cleaned.
- **Batch 5, preact 11 + jsx-pistols 0.6**: ~90 pages (public, admin, user, from `e2e/support/page-lists.ts`) rendered before/after and diffed. Only differences: ` />` -> `/>`, `data-sort-default` -> `data-sort-default="true"`, `autoFocus` -> `autofocus`, and `role="button"` dropped from the entry division `<label>`s (Preact 11 types forbid it). The Babel optional chaining plugin was dropped (Node 22 runs it natively). The JSX type augmentation (`types/preact/index.d.ts`) now targets `preact/src/dom`.

All batches: type-check, lint, unit tests, build, production boot and the 51 e2e tests pass.

## Remaining

- `@types/jquery` 4 / `jquery` 4: **blocked by Bootstrap 4**.

### Not planned / blocked
- **Knex 0.21 -> 1+/3, `sqlite3` 6**: blocked by the Bookshelf fork's peer range (`knex <0.22`). Unblocking means widening the fork's range and testing Bookshelf 1.2 against newer Knex, treated as its own project with the migrations suite as the safety net. (Bookshelf 1.x itself and Knex 0.21 are done.)
- **TypeORM 0.2 -> 1.x**: keep the package, but the upgrade is large (DataSource API, decorators, metadata). Separate project, coordinate with the Knex work since both touch the same database.
- **TypeScript 7**: `typescript-eslint` peers stop at `<6.1` and `typedoc` at 6.0.x. Try 5.9 -> 6.0 when tooling supports it; 7 only once typescript-eslint does.
- **Bootstrap 5 / jQuery 4**: out of scope by decision.
- **`@types/node`**: stay on 22 to match the runtime. Bump together with the Node version.

## Open questions for the owner
- Should `deployment/upgrade.sh` change (install dev deps, build, prune) be tried on a staging server before the next real deploy?
