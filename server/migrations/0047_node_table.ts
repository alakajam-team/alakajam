/**
 * Replace the polymorphic `node_type` + `node_id` pairs of comments, likes and user roles
 * by a real foreign key to a new `node` parent table, shared by posts and entries.
 *
 * - Entries keep their IDs
 * - Posts are moved to `POST_ID_FLOOR + <old ID>` (old ID kept in `post.legacy_id`),
 *   post IDs stored outside foreign keys are rewritten too (event statuses, event presets, featured post setting)
 * - Orphan comments, likes and user roles are deleted
 *
 * This migration is irreversible.
 */

if (__filename.endsWith(".js")) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("module-alias/register");
}

import config from "server/core/config";

/**
 * Frozen copy of `constants.POST_ID_FLOOR`
 */
const POST_ID_FLOOR = 2000;

const NODE_CHILD_TABLES = ["comment", "like", "user_role"];
const EVENT_STATUS_COLUMNS = ["status_rules", "status_theme", "status_results"];

exports.up = async (knex) => {
  const isPostgres = config.DB_TYPE === "postgresql";
  if (!isPostgres && (await knex.raw("PRAGMA foreign_keys"))[0].foreign_keys) {
    throw new Error("SQLite foreign keys must be disabled to rebuild tables (see db.upgradeDatabase())");
  }

  await assertIdsBelowFloor(knex);

  // Node table, filled with entries then posts (at their new IDs)

  await knex.schema.createTable("node", (table) => {
    table.increments("id").primary();
    table.string("type").notNullable();
  });
  await knex.raw("INSERT INTO node (id, type) SELECT id, 'entry' FROM entry");
  await knex.raw(`INSERT INTO node (id, type) SELECT id + ${POST_ID_FLOOR}, 'post' FROM post`);

  // Move posts to their new IDs, and make post & entry IDs point to the node table

  if (isPostgres) {
    await knex.schema.alterTable("post", (table) => {
      table.integer("legacy_id").unique();
    });
    await knex.raw(`UPDATE post SET legacy_id = id, id = id + ${POST_ID_FLOOR}`);
    for (const tableName of ["post", "entry"]) {
      await knex.raw(`ALTER TABLE "${tableName}" ALTER COLUMN id DROP DEFAULT`);
      await knex.raw(`DROP SEQUENCE IF EXISTS "${tableName}_id_seq"`);
      await knex.schema.alterTable(tableName, (table) => {
        table.foreign("id").references("node.id").onDelete("CASCADE");
      });
    }
  } else {
    const autoIncrementedId = sqlPattern("`id` integer not null primary key autoincrement");
    const nodeIdColumn = '"id" integer not null primary key references "node"("id") on delete cascade';
    await rebuildSqliteTable(knex, "post",
      (sql) => replaceOnce(sql, autoIncrementedId, nodeIdColumn + ', "legacy_id" integer'),
      { copyExpressions: { id: `id + ${POST_ID_FLOOR}`, legacy_id: "id" } });
    await knex.raw('CREATE UNIQUE INDEX "post_legacy_id_unique" on "post" ("legacy_id")');
    await rebuildSqliteTable(knex, "entry",
      (sql) => replaceOnce(sql, autoIncrementedId, nodeIdColumn));
  }

  // Comments, likes and user roles: real foreign key to the node table

  for (const tableName of NODE_CHILD_TABLES) {
    await knex(tableName)
      .where("node_type", "post")
      .update({ node_id: knex.raw("node_id + ?", [POST_ID_FLOOR]) });
  }
  await deleteOrphans(knex);

  if (isPostgres) {
    for (const tableName of NODE_CHILD_TABLES) {
      await knex.raw(`DROP INDEX IF EXISTS "${tableName}_node_id_node_type_index"`);
      await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn("node_type");
        table.foreign("node_id").references("node.id").onDelete("CASCADE");
        table.index("node_id");
      });
    }
  } else {
    for (const tableName of NODE_CHILD_TABLES) {
      await rebuildSqliteTable(knex, tableName,
        (sql) => replaceOnce(
          replaceOnce(sql, sqlPattern(", `node_type` varchar(255) not null"), ""),
          sqlPattern("`node_id` integer not null"),
          '"node_id" integer not null references "node"("id") on delete cascade'),
        { excludeColumns: ["node_type"], excludeIndexesOn: ["node_type"] });
      await knex.raw(`CREATE INDEX "${tableName}_node_id_index" on "${tableName}" ("node_id")`);
    }
  }

  // Post IDs stored outside foreign keys

  await rewritePostIdColumns(knex, "event", EVENT_STATUS_COLUMNS);
  await rewritePostIdColumns(knex, "event_preset", EVENT_STATUS_COLUMNS);
  const featuredPostSetting = await knex("setting").where("key", "featured_post_id").first();
  if (featuredPostSetting && isLegacyPostId(featuredPostSetting.value)) {
    await knex("setting").where("key", "featured_post_id")
      .update({ value: String(parseInt(featuredPostSetting.value, 10) + POST_ID_FLOOR) });
  }

  // Make new nodes start above the floor

  const maxNodeId = Math.max(POST_ID_FLOOR, (await knex("node").max("id as max").first()).max || 0);
  if (isPostgres) {
    await knex.raw("SELECT setval(pg_get_serial_sequence('node', 'id'), ?)", [maxNodeId]);
  } else {
    await knex("sqlite_sequence").where("name", "node").delete();
    await knex("sqlite_sequence").insert({ name: "node", seq: maxNodeId });
    await knex("sqlite_sequence").whereIn("name", ["post", "entry"]).delete();
  }
};

exports.down = () => {
  throw new Error("Migration 0047_node_table is irreversible, please restore a backup");
};

async function assertIdsBelowFloor(knex): Promise<void> {
  for (const tableName of ["post", "entry"]) {
    const maxId = (await knex(tableName).max("id as max").first()).max || 0;
    if (maxId >= POST_ID_FLOOR) {
      throw new Error(`Cannot migrate: ${tableName} IDs must be below ${POST_ID_FLOOR} (found ${maxId})`);
    }
  }
}

async function deleteOrphans(knex): Promise<void> {
  const orphanCommentIds = knex("comment").select("id").whereNotIn("node_id", knex("node").select("id"));
  await knex("comment").whereIn("parent_id", orphanCommentIds).update({ parent_id: null });

  for (const tableName of NODE_CHILD_TABLES) {
    const deletedCount = await knex(tableName).whereNotIn("node_id", knex("node").select("id")).delete();
    if (deletedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`Deleted ${deletedCount} orphan rows from ${tableName}`);
    }
  }
}

async function rewritePostIdColumns(knex, tableName: string, columns: string[]): Promise<void> {
  const rows = await knex(tableName).select("id", ...columns);
  for (const row of rows) {
    const changes = {};
    for (const column of columns) {
      if (isLegacyPostId(row[column])) {
        changes[column] = String(parseInt(row[column], 10) + POST_ID_FLOOR);
      }
    }
    if (Object.keys(changes).length > 0) {
      await knex(tableName).where("id", row.id).update(changes);
    }
  }
}

function isLegacyPostId(value: unknown): boolean {
  return /^\d+$/.test(String(value ?? "")) && parseInt(String(value), 10) < POST_ID_FLOOR;
}

/**
 * SQLite cannot alter primary keys nor add foreign keys: rebuild the table from its altered DDL instead.
 * Indexes are recreated, except those on excluded columns.
 */
async function rebuildSqliteTable(
  knex,
  tableName: string,
  transformCreateSql: (sql: string) => string,
  options: {
    excludeColumns?: string[];
    excludeIndexesOn?: string[];
    copyExpressions?: Record<string, string>;
  } = {}): Promise<void> {
  const tempTableName = tableName + "_rebuild";
  const table = await knex("sqlite_master").where({ type: "table", name: tableName }).first();
  const indexes = await knex("sqlite_master").where({ type: "index", tbl_name: tableName }).whereNotNull("sql");

  const createSql = transformCreateSql(table.sql);
  await knex.raw(replaceOnce(createSql, sqlPattern(`CREATE TABLE \`${tableName}\``), `CREATE TABLE "${tempTableName}"`));

  const copyExpressions: Record<string, string> = {};
  for (const column of await knex.raw(`PRAGMA table_info("${tableName}")`)) {
    if (!(options.excludeColumns || []).includes(column.name)) {
      copyExpressions[column.name] = `"${column.name}"`;
    }
  }
  Object.assign(copyExpressions, options.copyExpressions);
  const insertColumns = Object.keys(copyExpressions).map((name) => `"${name}"`);
  await knex.raw(`INSERT INTO "${tempTableName}" (${insertColumns.join(", ")}) `
    + `SELECT ${Object.values(copyExpressions).join(", ")} FROM "${tableName}"`);

  await knex.raw(`DROP TABLE "${tableName}"`);
  await knex.raw(`ALTER TABLE "${tempTableName}" RENAME TO "${tableName}"`);

  for (const index of indexes) {
    if (!(options.excludeIndexesOn || []).some((column) => sqlPattern(`\`${column}\``).test(index.sql))) {
      await knex.raw(index.sql);
    }
  }
}

function replaceOnce(text: string, search: RegExp, replacement: string): string {
  if (!search.test(text)) {
    throw new Error(`Unexpected SQL, could not find: ${search}\nin: ${text}`);
  }
  return text.replace(search, replacement);
}

/**
 * Turns an SQL snippet into a case-insensitive pattern accepting both identifier quotes (`id` or "id")
 */
function sqlPattern(snippet: string): RegExp {
  const escaped = snippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/`/g, "[`\"]");
  return new RegExp(escaped, "i");
}
