# Bookshelf → TypeORM migration plan

Status snapshot (late 2026): every Bookshelf model in `server/core/models.ts` already has a TypeORM entity.
What remains is the **query/service layer** and the **compat layer** (`bookshelf-compatible.entity.ts`).

## Where we stand

* 25 Bookshelf models in `core/models.ts` (~1,100 lines), all with a matching entity.
* ~23 non-spec files import `models` (~4,700 lines of services/controllers to rewrite).
* ~1,265 `.get("x")` and ~120 `.related("x")` call sites (services + TSX templates), served by `BookshelfCompatibleEntity`.
* 37 `transacting` uses, 10 `fetchPage` calls, ~46 raw Knex uses outside migrations.
* Heaviest files: `entry.service.ts`, `highscore.service.ts`, `tournament.service.ts`, `rating.service.ts`, `post.service.ts`.
  Most used models: `Entry`, `Theme`, `Event`, `Post`, `EntryScore`.
* Safety net: unit specs (only a few touch `models`) + the Playwright e2e suite, which is the real regression net.
* TypeORM is on 0.2.31. Knex is pinned to 0.17.6 by Bookshelf (see `DEPENDENCIES.md`).

## TypeORM version strategy

**Upgrade to 0.3.31 first, to 1.x only at the very end.**

* Every new `getRepository(...)` / `findOne(id)` written on 0.2 is more code to rewrite later, so upgrade before migrating more code.
* 0.3 brings `DataSource`, `FindOptionsWhere` (filtering on related tables), object-form `relations`,
  `findBy` / `exists` / `upsert` and `@VirtualColumn`, which replace many Bookshelf `withRelated` / `innerJoin` queries.
* Use **only APIs that also exist in 1.x** during that upgrade: a `DataSource` accessor instead of global helpers,
  `findOneBy`, `FindOptionsWhere`, object-form `relations` / `select`.
* 1.x is blocked until Bookshelf is gone: it drops the `sqlite3` driver (only `better-sqlite3`), and Knex 0.17 has no
  `better-sqlite3` dialect. Moving TypeORM alone would put two native SQLite drivers on the same file.
* 1.x also removes the global helpers (`getRepository`, `getManager`, `getConnection`, `createConnection`), string-form
  `relations` / `select`, `findByIds`, `findOneById`, `Repository.exist()` and `Connection`.
  `npx @typeorm/codemod v1` automates most of it.

## Order

| # | Step | Estimate |
|---|---|---|
| 1 | TypeORM 0.2 → 0.3.31, no global helpers. Add an ESLint `no-restricted-imports` rule on `core/models` and `getRepository` with a shrinking allowlist. | 2–3 d |
| 2 | Shared helpers: one transaction pattern (replaces `transacting`), pagination helper (replaces `fetchPage`), JSON column transformers (replace `parse`/`format`). Verify `dependents()` cascades match the Bookshelf `dependents` lists. | 2–3 d |
| 3 | Leaf models: `Setting`, `Platform`, `Tag`, `EventPreset`, `EventTemplate`, `UserRole` (`security.ts`). Settles the patterns. | 2–3 d |
| 4 | Theme aggregate: `Theme`, `ThemeVote`, voting / shortlist / stats services (~650 lines, self-contained). | 3–4 d |
| 5 | Event aggregate: `Event`, `EventDetails`, `event.service`. | 2–3 d |
| 6 | Posts, comments, likes. | 3–4 d |
| 7 | Entry aggregate: `Entry`, `EntryDetails`, `EntryVote`, `EntryInvite`, entry / team / team-invite / rating / karma services, `entry-manage.controller`. Largest step. | 6–8 d |
| 8 | Scores: `EntryScore`, `TournamentScore`, `TournamentEntry` (highscore + tournament services). | 4–5 d |
| 9 | Remove the compat layer: type-aware codemod (ts-morph) `.get("x")` → `.x`, `.related("x")` → `.x`; delete `models.ts`, Bookshelf half of `db.ts`, `bookshelf*` packages, `BookshelfCompatibleEntity`. | 2–3 d |
| 10 | Upgrade Knex; keep it only for the 52 migrations and `connect-session-knex` (do not port migrations). | 1–2 d |
| 11 | TypeORM 1.x + `better-sqlite3` for TypeORM and Knex, codemod, `reflect-metadata` 0.2. | 1–2 d |

Total: roughly 30–40 working days (estimate from line counts, not measured).

Steps 4–8 migrate an aggregate together with **all its consumers**, to avoid mixing Bookshelf and TypeORM instances in one
object graph, which is the main source of subtle bugs. `Entry` goes last among the big ones because posts, comments and
scores refer to it.

## Risks

* SQLite vs PostgreSQL differences (decimals, JSON columns, dates, `ILike`): run e2e on both if possible.
* `rating.service` and `highscore.service` hold the most SQL-heavy logic: add unit tests before rewriting them.
* Bookshelf and TypeORM use separate connection pools, so transactions do not span both during the transition.
  Do not mix them within one operation.
* Check `connect-session-knex` against the newer Knex at step 10.
