import { createRequire } from "module";

// Knex loads DB migrations through Node directly (not through Vite), so they need the TS and path alias hooks
const nodeRequire = createRequire(__filename);
nodeRequire("ts-node/register/transpile-only");
nodeRequire("tsconfig-paths/register");
