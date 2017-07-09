# [Knex](http://knexjs.org) migrations

## Howto

Every time you need to change the database model, add an new file using the format `<incremental ID>_<feature>.js` using the same structure:

```
/**
 * [[Feature description]]
 */

exports.up = async function (knex, Promise) {
  try {
    // [[Table changes]]
    
    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}

exports.down = async function (knex, Promise) {
  try {
    // [[Table rollbacks]]
    
    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}
```

It will be run the next time the server is started.

## Tips

* Make sure the `browser-refresh` is **stopped** when working on migrations, otherwise it might run them sooner than you wanted!
* If an update must be undone, you can rollback the database state with `knex migrate:rollback` (assuming you installed it: `npm i -g knex`)