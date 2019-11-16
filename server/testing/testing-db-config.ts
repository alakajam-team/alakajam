import * as path from "path";
import config, * as configUtils from "../core/config";
import * as knexfile from "../core/knexfile";

const editableConfig = config as any;
const editableKnexfile = knexfile as any;

editableConfig.DB_TYPE
  = editableKnexfile.development.client
  = "sqlite3";

editableConfig.DB_SQLITE_FILENAME
  = editableKnexfile.development.connection.filename
  = path.resolve(configUtils.tmpPathAbsolute(), "unit-test.sqlite");

delete editableKnexfile.development.pool;
