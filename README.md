# WeJam

> Current progress : Mostly just a skeleton for a generic website. You can browse an event and its entries.

## Setup

Requirement: NodeJS 7.2+

* `npm install`
* `npm start` (or `node --harmony wejam.js`)
* Browse to `http://localhost:8000`

### Dev tooling

`npm install -g standard forever node-inspector`

* Make the app restart automatically upon file changes with `npm run-script forever`
* Debug code by running `npm run-script debug`
* Validate code style with `standard`

### Troubleshooting

* Can't install `node-inspector` on Windows? Try an older version: `npm install -g node-inspector@0.7.5`.
* Can't kill node with Ctrl+C on Windows? Use the task manager.

## Architecture

This [NodeJS](https://nodejs.org/api/documentation.html) app is based on [Express](http://expressjs.com/en/4x/api.html), [Nunjucks](https://mozilla.github.io/nunjucks/templating.html) (server-side templates), and the full [Bookshelf](http://bookshelfjs.org/) (ORM) + [Knex](http://knexjs.org/) (SQL builder) combo on top of a relational database (tested with SQLite). The website is mostly static so things are kept simple on the client-side, just [Bootstrap](http://getbootstrap.com/components/) and CSS enhanced by [CSSNext](http://cssnext.io/features/) (no build chain for now, the CSS is compiled live).

The code takes advantage of the [async/await syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) to make asynchronous code look cool, and in general follows the [Standard JS](http://standardjs.com/) style.
