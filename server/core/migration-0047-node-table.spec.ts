/* eslint-disable @typescript-eslint/no-unused-expressions */

/**
 * End-to-end test of the `0047_node_table` migration on SQLite.
 * Lives outside of `server/migrations/`, as knex would load any `.ts` file there as a migration.
 */

import { expect } from "chai";
import { mkdirpSync } from "fs-extra";
import * as fs from "fs";
import Knex from "knex";
import { createRequire } from "module";
import * as path from "path";
import * as configUtils from "server/core/config";
import constants from "server/core/constants";
import { afterAll, beforeAll, describe, it } from "vitest";

const MIGRATIONS_PATH = path.resolve(constants.ROOT_PATH, "server/migrations");
const MIGRATION_0047 = "0047_node_table.ts";
const POST_ID_FLOOR = 2000;

// Knex loads migrations through Node directly (see vitest-setup.ts)
const nodeRequire = createRequire(__filename);

describe("Migration 0047_node_table (SQLite)", { timeout: 20000 }, () => {

  describe("on a populated database", () => {
    let knex: Knex;
    let indexesBefore: Record<string, string[]>;

    beforeAll(async () => {
      knex = createScratchDatabase("migration-0047.sqlite");
      await migrateUpTo(knex, "0046");
      await insertLegacyData(knex);
      indexesBefore = await listIndexes(knex, ["post", "entry", "comment", "like", "user_role"]);

      await migrateUpTo(knex, "0047");
    });

    afterAll(async () => {
      await knex?.destroy();
    });

    it("should create one node per entry and per post", async () => {
      const nodes = await knex("node").orderBy("id");

      expect(nodes.map((node) => [node.id, node.type])).to.deep.equal([
        [1, "entry"],
        [2, "entry"],
        [2001, "post"],
        [2002, "post"],
        [2003, "post"]
      ]);
    });

    it("should move posts above the floor, keeping their legacy ID", async () => {
      const posts = await knex("post").orderBy("id");

      expect(posts.map((post) => [post.id, post.legacy_id, post.title])).to.deep.equal([
        [2001, 1, "Post 1"],
        [2002, 2, "Post 2"],
        [2003, 3, "Post 3"]
      ]);
      expect(posts[1].entry_id).to.equal(1);
      expect(posts[1].event_id).to.equal(1);
    });

    it("should keep entry IDs", async () => {
      const entries = await knex("entry").orderBy("id");

      expect(entries.map((entry) => [entry.id, entry.title])).to.deep.equal([
        [1, "Entry 1"],
        [2, "Entry 2"]
      ]);
    });

    it("should retarget comments, likes and roles of posts", async () => {
      expect(await nodeIdsById(knex, "comment")).to.deep.equal({ 1: 1, 2: 2001, 3: 2001, 5: 2, 6: 2002 });
      expect(await nodeIdsById(knex, "like")).to.deep.equal({ 1: 2001, 2: 1 });
      expect(await nodeIdsById(knex, "user_role")).to.deep.equal({ 1: 1, 2: 2001, 3: 2002 });
    });

    it("should delete orphans, and detach replies to orphan comments", async () => {
      expect(await knex("comment").where("id", 4).first()).to.be.undefined;
      expect(await knex("like").where("id", 3).first()).to.be.undefined;
      expect(await knex("user_role").where("id", 4).first()).to.be.undefined;

      const reply = await knex("comment").where("id", 5).first();
      expect(reply.parent_id).to.be.null;
      expect(reply.body).to.equal("Reply to orphan");
      expect((await knex("comment").where("id", 3).first()).parent_id).to.equal(2);
    });

    it("should drop the node_type columns and their indexes", async () => {
      for (const tableName of ["comment", "like", "user_role"]) {
        const columns = (await knex.raw(`PRAGMA table_info("${tableName}")`)).map((column) => column.name);
        expect(columns, tableName).to.include("node_id");
        expect(columns, tableName).not.to.include("node_type");
      }

      const indexesAfter = await listIndexes(knex, ["post", "entry", "comment", "like", "user_role"]);
      expect(indexesAfter).to.deep.equal({
        post: [...indexesBefore.post, "post_legacy_id_unique"].sort(),
        entry: indexesBefore.entry,
        comment: ["comment_node_id_index"],
        like: ["like_node_id_index"],
        user_role: ["user_role_node_id_index"]
      });
    });

    it("should rewrite post IDs in event statuses, leaving other values untouched", async () => {
      const event = await knex("event").where("id", 1).first();
      expect(event.status_rules).to.equal("2001");
      expect(event.status_theme).to.equal("voting");
      expect(event.status_results).to.equal("2003");

      const preset = await knex("event_preset").where("id", 1).first();
      expect(preset.status_rules).to.equal("off");
      expect(preset.status_theme).to.equal("2002");
      expect(preset.status_results).to.be.null;
    });

    it("should rewrite the featured post setting", async () => {
      const setting = await knex("setting").where("key", "featured_post_id").first();
      expect(setting.value).to.equal("2002");
      expect((await knex("setting").where("key", "other_setting").first()).value).to.equal("42");
    });

    it("should leave no foreign key violations", async () => {
      expect(await knex.raw("PRAGMA foreign_key_check")).to.deep.equal([]);
    });

    it("should make new nodes start above the floor", async () => {
      const sequence = await knex("sqlite_sequence").where("name", "node").first();
      expect(sequence.seq).to.be.at.least(POST_ID_FLOOR);

      const [newNodeId] = await knex("node").insert({ type: "post" });
      expect(newNodeId).to.be.greaterThan(2003);
      await knex("node").where("id", newNodeId).delete();
    });

    it("should cascade node deletions to comments, likes and roles", async () => {
      await knex("node").where("id", 2001).delete();

      expect(await knex("comment").where("node_id", 2001)).to.deep.equal([]);
      expect(await knex("like").where("node_id", 2001)).to.deep.equal([]);
      expect(await knex("user_role").where("node_id", 2001)).to.deep.equal([]);

      expect(await knex("comment").where("node_id", 1)).to.have.length(1);
      expect(await knex("post").where("id", 2002).first()).to.be.ok;

      await knex("node").where("id", 2).delete();
      expect(await knex("comment").where("node_id", 2)).to.deep.equal([]);
    });
  });

  describe("safety checks", () => {
    let knex: Knex;

    beforeAll(async () => {
      knex = createScratchDatabase("migration-0047-refused.sqlite");
      await migrateUpTo(knex, "0046");
      await knex("user").insert(userRow(1, "alice"));
      await knex("event").insert(eventRow(1));
    });

    afterAll(async () => {
      await knex?.destroy();
    });

    it("should refuse to run when entry IDs reach the floor", async () => {
      await knex("entry").insert(entryRow(POST_ID_FLOOR));
      await expectMigrationError(knex, /entry IDs must be below 2000 \(found 2000\)/);
      await knex("entry").delete();
    });

    it("should refuse to run when post IDs reach the floor", async () => {
      await knex("post").insert(postRow(POST_ID_FLOOR + 5, { title: "Big post" }));
      await expectMigrationError(knex, /post IDs must be below 2000 \(found 2005\)/);
      await knex("post").delete();
    });
  });

});

function createScratchDatabase(fileName: string): Knex {
  const filename = path.resolve(configUtils.tmpPathAbsolute(), fileName);
  mkdirpSync(path.dirname(filename));
  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
  }
  // Like the app (see db.ts), connections enforce foreign keys
  return (Knex as any)({
    client: "sqlite3",
    useNullAsDefault: true,
    connection: { filename },
    pool: { afterCreate: (connection, done) => connection.run("PRAGMA foreign_keys = ON", done) }
  });
}

/**
 * Runs all migrations whose file name is lower or equal to the given prefix
 */
async function migrateUpTo(knex: Knex, lastMigrationPrefix: string): Promise<void> {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: () => Promise.resolve(fs.readdirSync(MIGRATIONS_PATH)
        .filter((file) => /^\d{4}_.*\.ts$/.test(file) && file.slice(0, 4) <= lastMigrationPrefix)
        .sort()),
      getMigrationName: (file: string) => file,
      getMigration: (file: string) => nodeRequire(path.join(MIGRATIONS_PATH, file))
    }
  } as any);
}

async function expectMigrationError(knex: Knex, expectedMessage: RegExp): Promise<void> {
  let error: Error | undefined;
  try {
    await migrateUpTo(knex, "0047");
  } catch (e) {
    error = e;
  }
  expect(error?.message).to.match(expectedMessage);
  expect(await knex.schema.hasTable("node")).to.be.false;
  const completed = await knex("knex_migrations").where("name", MIGRATION_0047);
  expect(completed).to.deep.equal([]);
}

/**
 * Legacy data, where post IDs collide with entry IDs.
 *
 * - Entries 1, 2; posts 1, 2 (about entry 1), 3
 * - Comments: 1 on entry 1, 2 on post 1, 3 on post 1 (reply to 2), 4 orphan (entry 999), 5 on entry 2 (reply to 4),
 *   6 on post 2
 * - Likes: 1 on post 1, 2 on entry 1, 3 orphan (post 50)
 * - Roles: 1 on entry 1, 2 on post 1, 3 on post 2, 4 orphan (post 999)
 */
async function insertLegacyData(knex: Knex): Promise<void> {
  await knex("user").insert([userRow(1, "alice"), userRow(2, "bob")]);
  await knex("event").insert(eventRow(1, { status_rules: "1", status_theme: "voting", status_results: "3" }));
  await knex("event_preset").insert({
    id: 1, title: "Preset", status: "pending",
    status_rules: "off", status_theme: "2", status_entry: "off", status_results: null
  });
  await knex("setting").insert([
    { key: "featured_post_id", value: "2" },
    { key: "other_setting", value: "42" }
  ]);

  await knex("entry").insert([entryRow(1), entryRow(2)]);
  await knex("post").insert([
    postRow(1),
    postRow(2, { entry_id: 1, event_id: 1 }),
    postRow(3)
  ]);

  await knex("comment").insert([
    commentRow(1, 1, "entry"),
    commentRow(2, 1, "post"),
    commentRow(3, 1, "post", { parent_id: 2 }),
    commentRow(4, 999, "entry"),
    commentRow(5, 2, "entry", { parent_id: 4, body: "Reply to orphan" }),
    commentRow(6, 2, "post")
  ]);
  await knex("like").insert([
    { id: 1, type: "like", user_id: 2, node_id: 1, node_type: "post" },
    { id: 2, type: "like", user_id: 2, node_id: 1, node_type: "entry" },
    { id: 3, type: "like", user_id: 2, node_id: 50, node_type: "post" }
  ]);
  await knex("user_role").insert([
    roleRow(1, 1, "entry"),
    roleRow(2, 1, "post"),
    roleRow(3, 2, "post"),
    roleRow(4, 999, "post")
  ]);
}

function userRow(id: number, name: string): Record<string, unknown> {
  return { id, name, title: name, email: `${name}@example.com`, password: "x", password_salt: "x" };
}

function eventRow(id: number, statuses: Record<string, string> = {}): Record<string, unknown> {
  return {
    id, name: `event-${id}`, title: `Event ${id}`, status: "open",
    status_theme: "off", status_entry: "off", status_results: "off", status_rules: "off",
    ...statuses
  };
}

function entryRow(id: number): Record<string, unknown> {
  return { id, event_id: 1, name: `entry-${id}`, title: `Entry ${id}`, comment_count: 0 };
}

function postRow(id: number, fields: Record<string, unknown> = {}): Record<string, unknown> {
  return { id, author_user_id: 1, name: `post-${id}`, title: `Post ${id}`, ...fields };
}

function commentRow(id: number, nodeId: number, nodeType: string, fields: Record<string, unknown> = {}):
Record<string, unknown> {
  return { id, node_id: nodeId, node_type: nodeType, user_id: 2, body: `Comment ${id}`, ...fields };
}

function roleRow(id: number, nodeId: number, nodeType: string): Record<string, unknown> {
  return { id, user_id: 1, user_name: "alice", node_id: nodeId, node_type: nodeType, permission: "manage" };
}

async function nodeIdsById(knex: Knex, tableName: string): Promise<Record<number, number>> {
  const rows = await knex(tableName).select("id", "node_id");
  return Object.fromEntries(rows.map((row) => [row.id, row.node_id]));
}

async function listIndexes(knex: Knex, tableNames: string[]): Promise<Record<string, string[]>> {
  const indexes: Record<string, string[]> = {};
  for (const tableName of tableNames) {
    const rows = await knex("sqlite_master").where({ type: "index", tbl_name: tableName }).whereNotNull("sql");
    indexes[tableName] = rows.map((row) => row.name).sort();
  }
  return indexes;
}
