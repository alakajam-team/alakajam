# Alakajam! Agent Guide

**Alakajam!** is a website powering a game making community that hosts game jams and competitions.

## Tech Stack

- Node.js
- TypeScript (both backend, and sprinkled-in frontend dynamic logic)
- Express.js
- Preact
- Bookshelf.js (with Knex.js)
- SQLite3 (dev), PostgreSQL (production)
- JSX/TSX for templates (server-side rendering with Preact)
- Sass, Bootstrap 4.6
- Mocha (unit tests), Cypress (E2E tests)

## Folder Structure & Useful Files

```
alakajam/
|
|__ server/                    Backend TypeScript code
|   |__ index.ts              Main application entry point
|   |__ routes.ts             Application routing configuration
|   |__ base.template.tsx     Base HTML template
|   |__ core/                 Core services (database, security, file storage, etc.)
|   |__ entity/               Entity models and services
|   |__ entry/                Game entry related features
|   |__ event/                Event/jam management
|   |__ user/                 User management
|   |__ admin/                Admin panel
|   |__ post/                 Blog posts
|   |__ migrations/           Database migrations
|   |__ scripts/              Build and utility scripts
|
|__ client/                    Frontend TypeScript code
|   |__ scripts/              Client-side JavaScript/TypeScript
|   |__ scss/                 Sass stylesheets
|   |__ css/                  Compiled CSS
|   |__ fonts/                Font files
|   |__ images/               Client images
|
|__ static/                    Static assets served directly
|__ cypress/                   End-to-end tests
|__ deployment/                Deployment scripts and configuration
|__ types/                     TypeScript type definitions
|
|__ package.json              Dependencies and npm scripts
|__ tsconfig.json             TypeScript configuration (root)
|__ tsconfig.build.json       TypeScript build configuration
|__ config.sample.js          Sample configuration (copy to config.js)
|__ webpack.common.js         Shared webpack configuration
|__ webpack.development.js    Development webpack config
|__ webpack.production.js     Production webpack config
|__ .eslintrc.js              ESLint configuration
|__ README.md                 Setup and basic usage
```

## Useful Commands for Agents

### Building

```bash
# Build everything (CSS + client + server)
npm run build

# Build CSS from Sass
npm run build:css

# Build client-side bundle
npm run build:client

# Build server TypeScript
npm run build:server
```

### Testing

```bash
# Run unit tests
npm test

# Run E2E tests (Cypress)
npm run test:e2e

# Run all tests (CI mode)
npm run test:ci

# Open Cypress UI
npm run cypress

# Run specific unit test
npm run test:unit -- <filename>
```

### Linting

```bash
# Lint all code
npm run lint

# Lint server code only
npm run lint:server

# Lint client code only
npm run lint:client

# Lint E2E tests
npm run lint:e2e
```

### Database

```bash
# Run latest migrations
npm run migrate:latest

# Rollback last migration
npm run migrate:rollback

# Check current migration version
npm run migrate:currentVersion

# Access Knex CLI
npm run knex -- <command>
```

### Production

```bash
# Start production server (requires build first)
npm run start:production
```
