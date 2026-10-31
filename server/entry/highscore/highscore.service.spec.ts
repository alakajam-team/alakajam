import { expect } from "chai";
import path from "path";
import constants from "server/core/constants";
import db from "server/core/db";
import { createEntry, createUser, submitHighScore } from "server/core/db-seed-helpers";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import { afterAll, beforeAll, describe, it } from "vitest";
import highScoreService from "./highscore.service";

const PICTURE = path.join(constants.ROOT_PATH, "e2e/fixtures/picture.jpg");

describe("High score service", { timeout: DB_TEST_TIMEOUT }, () => {
  let userId: number;
  let activeEntryId: number;
  let suspendedEntryId: number;

  beforeAll(async () => {
    await startTestDB();
    const user = await createUser("score-user");
    const activeEntry = await createEntry(user, { title: "Active game", highScores: { type: "number" } });
    const suspendedEntry = await createEntry(user, { title: "Suspended game", highScores: { type: "number" } });
    await submitHighScore(user, activeEntry, 10, PICTURE);
    await submitHighScore(user, suspendedEntry, 10, PICTURE);

    userId = user.id;
    activeEntryId = activeEntry.get("id");
    suspendedEntryId = suspendedEntry.get("id");
    const suspendedScore = await db.knex("entry_score").where({ entry_id: suspendedEntryId, user_id: userId }).first();
    await highScoreService.setEntryScoreActive(suspendedScore.id, false);
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("find user scores", () => {

    it("should exclude suspended scores by default (#636)", async () => {
      const scores = await highScoreService.findUserScores(userId);

      expect(scores.models.map(score => score.get("entry_id"))).to.deep.equal([activeEntryId]);
    });

    it("should include suspended scores when requested", async () => {
      const scores = await highScoreService.findUserScores(userId, { withSuspended: true });

      expect(scores.models.map(score => score.get("entry_id")).sort()).to.deep.equal([activeEntryId, suspendedEntryId].sort());
    });

  });
});
