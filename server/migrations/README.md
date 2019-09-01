# [Knex](http://knexjs.org) migrations

## Howto

Every time you need to change the database model, add a new file using the `<incremental ID>_<feature>.js` format, using the same structure:

```typescript
/**
 * [[Migration description]]
 */

import * as Knex from "knex";

exports.up = async (knex: Knex) => {
  // [[Table changes]]
}

exports.down = async (knex: Knex) => {
  // [[Table rollbacks]]
}
```

It will be run automatically the next time the server is started.

## Tips

* Make sure  `browser-refresh` is **stopped** when working on migrations, otherwise it might run them sooner than you wanted!
* If an update must be undone, you can rollback the database state with `knex migrate:rollback` (assuming you installed it: `npm i -g knex`)
