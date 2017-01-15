# WeJam

## Server setup

Requirement: NodeJS 7.2+

* `npm install`
* `npm start`
* Browse to `http://localhost:8000`

## Dev tooling

`npm install -g standard nodemon node-inspector`

* Make the app restart automatically upon file changes with `npm run-script forever`
* Debug code by running `npm run-script debug`
* Validate code style with `standard`

## Troubleshooting

* Can't install `node-inspector` on Windows? Try an older version: `npm install -g node-inspector@0.7.5`.
* Can't kill node with Ctrl+C on Windows? Use the task manager.