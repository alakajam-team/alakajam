import * as path from "path";
import config, * as configUtils from "../core/config";

const editableConfig = config as any;
editableConfig.DB_TYPE = "sqlite3";
editableConfig.DB_SQLITE_FILENAME = path.resolve(configUtils.tmpPathAbsolute(), "unit-test.sqlite");
editableConfig.ROOT_URL = "http://localhost:8001";
editableConfig.DEBUG_INSERT_SAMPLES = false;
