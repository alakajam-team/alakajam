/**
 * Replace the polymorphic `node_type` + `node_id` pairs of comments, likes and user roles
 * by a real foreign key to a new `node` parent table, shared by posts and entries (issue #682).
 *
 * - Entries keep their IDs, posts are moved to `POST_ID_FLOOR + <old ID>` (old ID kept in `post.legacy_id`)
 * - Post IDs stored outside foreign keys are rewritten too (event statuses, event presets, featured post setting)
 * - Orphan comments, likes and user roles are deleted
 *
 * This migration is irreversible: restore a backup to roll it back.
 */

if (__filename.endsWith(".js")) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("module-alias/register");
}

import config from "server/core/config";

/**
 * The few steps that differ between databases, the rest of the migration is shared
 */
interface Dialect {
  /** Makes the ID of posts & entries a foreign key to `node.id`, and stops generating it */
  linkIdToNode(knex, tableName: string): Promise<void>;
  /** Drops `node_type`, and turns `node_id` into a foreign key to `node.id` (cascading deletions) */
  replaceNodeColumns(knex, tableName: string): Promise<void>;
  setNodeSequence(knex, lastNodeId: number): Promise<void>;
}

/**
 * Frozen copy of `constants.POST_ID_FLOOR`
 */
const POST_ID_FLOOR = 2000;

const NODE_CHILD_TABLES = ["comment", "like", "user_role"];
const EVENT_STATUS_COLUMNS = ["status_rules", "status_theme", "status_results"];

exports.up = async (knex) => {
  const dialect = config.DB_TYPE === "postgresql" ? postgresDialect : sqliteDialect;
  await assertIdsBelowFloor(knex);

  // Node table, filled with entries then posts (at their new IDs)

  await knex.schema.createTable("node", (table) => {
    table.increments("id").primary();
    table.string("type").notNullable();
  });
  await knex.raw("INSERT INTO node (id, type) SELECT id, 'entry' FROM entry");
  await knex.raw(`INSERT INTO node (id, type) SELECT id + ${POST_ID_FLOOR}, 'post' FROM post`);

  // Move posts to their new IDs, and make post & entry IDs point to the node table

  await knex.schema.alterTable("post", (table) => {
    table.integer("legacy_id").unique();
  });
  await knex.raw(`UPDATE post SET legacy_id = id, id = id + ${POST_ID_FLOOR}`);
  for (const tableName of ["post", "entry"]) {
    await dialect.linkIdToNode(knex, tableName);
  }

  // Comments, likes and user roles: real foreign key to the node table

  for (const tableName of NODE_CHILD_TABLES) {
    await knex(tableName)
      .where("node_type", "post")
      .update({ node_id: knex.raw("node_id + ?", [POST_ID_FLOOR]) });
  }
  await deleteOrphans(knex);
  for (const tableName of NODE_CHILD_TABLES) {
    await dialect.replaceNodeColumns(knex, tableName);
    await knex.schema.alterTable(tableName, (table) => {
      table.index("node_id");
    });
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
  await dialect.setNodeSequence(knex, maxNodeId);
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

// ===============================================================
// PostgreSQL
// ===============================================================

const postgresDialect: Dialect = {
  async linkIdToNode(knex, tableName) {
    await knex.raw(`ALTER TABLE "${tableName}" ALTER COLUMN id DROP DEFAULT`);
    await knex.raw(`DROP SEQUENCE IF EXISTS "${tableName}_id_seq"`);
    await knex.schema.alterTable(tableName, (table) => {
      table.foreign("id").references("node.id").onDelete("CASCADE");
    });
  },

  async replaceNodeColumns(knex, tableName) {
    await knex.raw(`DROP INDEX IF EXISTS "${tableName}_node_id_node_type_index"`);
    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn("node_type");
      table.foreign("node_id").references("node.id").onDelete("CASCADE");
    });
  },

  async setNodeSequence(knex, lastNodeId) {
    await knex.raw("SELECT setval(pg_get_serial_sequence('node', 'id'), ?)", [lastNodeId]);
  },
};

// ===============================================================
// SQLite (development & tests only)
//
// SQLite cannot turn an existing column into a foreign key, so columns are swapped instead:
// add a new one that references `node`, copy the values over, drop the old one, then rename.
// Primary keys cannot be dropped either, so post & entry IDs are left as is (see `linkIdToNode()`).
// ===============================================================

const sqliteDialect: Dialect = {
  async linkIdToNode() {
    // Not possible: IDs stay `integer primary key autoincrement` without a foreign key. They are always provided
    // by the node, so the autoincrement is never used, and deleting a node does not cascade to its post or entry
    // (posts & entries are deleted first, then their node).
  },

  async replaceNodeColumns(knex, tableName) {
    await dropIndexesOn(knex, tableName, ["node_id", "node_type"]);
    await knex.raw(`ALTER TABLE "${tableName}" ADD COLUMN "node_id_new" integer REFERENCES "node"("id") ON DELETE CASCADE`);
    await knex.raw(`UPDATE "${tableName}" SET "node_id_new" = "node_id"`);
    await knex.raw(`ALTER TABLE "${tableName}" DROP COLUMN "node_id"`);
    await knex.raw(`ALTER TABLE "${tableName}" DROP COLUMN "node_type"`);
    await knex.raw(`ALTER TABLE "${tableName}" RENAME COLUMN "node_id_new" TO "node_id"`);
  },

  async setNodeSequence(knex, lastNodeId) {
    await knex("sqlite_sequence").where("name", "node").delete();
    await knex("sqlite_sequence").insert({ name: "node", seq: lastNodeId });
  },
};

/**
 * Drops the indexes covering any of the given columns (SQLite refuses to drop indexed columns)
 */
async function dropIndexesOn(knex, tableName: string, columnNames: string[]): Promise<void> {
  const indexes = (await knex.raw(`PRAGMA index_list("${tableName}")`)).filter((index) => index.origin === "c");
  for (const index of indexes) {
    const indexedColumns = (await knex.raw(`PRAGMA index_info("${index.name}")`)).map((column) => column.name);
    if (indexedColumns.some((column) => columnNames.includes(column))) {
      await knex.raw(`DROP INDEX "${index.name}"`);
    }
  }
}
