import { createRequire } from "module";
import config, { Config } from "../core/config";
import { Mutable } from "server/types";

// Knex loads DB migrations through Node directly (not through Vite), so they need the TS and path alias hooks
const nodeRequire = createRequire(__filename);
nodeRequire("ts-node/register/transpile-only");
nodeRequire("tsconfig-paths/register");

const editableConfig: Mutable<Config> = config as any;
editableConfig.DEBUG_DISABLE_CACHE = false;
editableConfig.DB_TYPE = "sqlite3";
editableConfig.DB_SQLITE_FILENAME = "data/test.sqlite";
