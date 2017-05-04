# WeJam

> Current progress: Mostly just a skeleton for a generic website. You can browse an event and its entries.

## Setup

Requirement: NodeJS 7.6+

* `npm install`
* `node wejam.js`
* Browse to `http://localhost:8000`

### Dev tools

Prerequisite: `npm install -g standard browser-refresh node-inspector jsdoc`

* `npm run-script docs`: Generates the JS documentation in the `docs/` folder.
* `browser-refresh wejam.js`: Launches the app, and makes the server and browser refresh when needed upon file changes (you need first to enable `DEBUG_REFRESH_BROWSER` in `config.js`).
* `node-debug we-jam.js`: Launches the app in debug mode.
* `standard`: Validates the code style.

See also [the wiki](https://github.com/mkalam-alami/we-jam/wiki) for additional developer documentation.

## Architecture

This [NodeJS](https://nodejs.org/api/documentation.html) app is based on [Express](http://expressjs.com/en/4x/api.html), [Nunjucks](https://mozilla.github.io/nunjucks/templating.html) (server-side templates), and the full [Bookshelf](http://bookshelfjs.org/) (ORM) + [Knex](http://knexjs.org/) (SQL builder) combo on top of a relational database (tested with SQLite & PostgreSQL). There's also [Winston](https://github.com/winstonjs/winston) for logging and [JSDoc](http://usejsdoc.org/) for documentation. The website is mostly static, so things are kept simple on the client-side, just [Bootstrap](http://getbootstrap.com/components/) (in [Bootflat](http://bootflat.github.io/documentation.html) flavour) and CSS enhanced by [CSSNext](http://cssnext.io/features/) (no build chain for now, the CSS is compiled live).

The code takes advantage of the [async/await syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) to make asynchronous code look cool, and in general follows the [Standard JS](http://standardjs.com/) style.
