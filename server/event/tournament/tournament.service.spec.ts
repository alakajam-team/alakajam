/* eslint-disable @typescript-eslint/no-unused-expressions */

import { expect } from "chai";
import path from "path";
import constants from "server/core/constants";
import db from "server/core/db";
import { createEntry, createEvent, createUser, submitHighScore } from "server/core/db-seed-helpers";
import enums from "server/core/enums";
import highscoreService from "server/entry/highscore/highscore.service";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import { afterAll, beforeAll, describe, it } from "vitest";
import tournamentService from "./tournament.service";

const PICTURE = path.join(constants.ROOT_PATH, "e2e/fixtures/picture.jpg");

describe("Tournament service", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("count submitted scores", () => {

    it("should count active scores over all tournament games, ignoring suspended and unrelated scores", async () => {
      const alice = await createUser("alice-user");
      const bob = await createUser("bobby-user");
      const event = await createEvent({
        name: "tournament", title: "Tournament", status_tournament: enums.EVENT.STATUS_TOURNAMENT.PLAYING
      });
      const game1 = await createEntry(alice, { title: "Game 1", highScores: { type: "number" } });
      const game2 = await createEntry(alice, { title: "Game 2", highScores: { type: "number" } });
      const otherGame = await createEntry(alice, { title: "Other game", highScores: { type: "number" } });
      await tournamentService.addTournamentEntry(event.get("id"), game1.get("id"));
      await tournamentService.addTournamentEntry(event.get("id"), game2.get("id"));

      expect(await tournamentService.countSubmittedScores(event)).to.equal(0);

      await submitHighScore(alice, game1, 10, PICTURE);
      await submitHighScore(bob, game1, 20, PICTURE);
      await submitHighScore(alice, game2, 30, PICTURE);
      await submitHighScore(alice, otherGame, 40, PICTURE);
      expect(await tournamentService.countSubmittedScores(event)).to.equal(3);

      const bobScore = await db.knex("entry_score").where({ entry_id: game1.get("id"), user_id: bob.id }).first();
      await highscoreService.setEntryScoreActive(bobScore.id, false);
      expect(await tournamentService.countSubmittedScores(event)).to.equal(2);
    });

    it("should return nothing for events that are not tournaments", async () => {
      const event = await createEvent({ name: "plain-event", title: "Plain event" });

      expect(await tournamentService.countSubmittedScores(event)).to.be.undefined;
    });

  });
});
