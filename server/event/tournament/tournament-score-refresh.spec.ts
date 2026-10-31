import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { expect } from "chai";
import { EntryBookshelfModel } from "bookshelf";
import enums from "server/core/enums";
import db from "server/core/db";
import { createEntry, createEvent, createUser, submitHighScore } from "server/core/db-seed-helpers";
import highscoreService from "server/entry/highscore/highscore.service";
import { User } from "server/entity/user.entity";
import { closeTestDB, startTestDB } from "server/testing/testing-db";
import tournamentService from "./tournament.service";

const PROOF = "client/css/flat.png";
const TEST_TIMEOUT = 20000;

describe("Tournament score refresh", { timeout: TEST_TIMEOUT }, () => {
  let alice: User;
  let bob: User;
  let carol: User;
  let game1: EntryBookshelfModel;
  let game2: EntryBookshelfModel;

  beforeAll(async () => {
    await startTestDB();
    alice = await createUser("alice", { password: "alice-password" });
    bob = await createUser("bob", { password: "bob-password" });
    carol = await createUser("carol", { password: "carol-password" });
    const event = await createEvent({
      name: "tournament", title: "Tournament", status_tournament: enums.EVENT.STATUS_TOURNAMENT.PLAYING
    });
    const options = { event, highScores: { type: enums.ENTRY.HIGH_SCORE_TYPE.NUMBER } };
    game1 = await createEntry(alice, { title: "Game 1", ...options });
    game2 = await createEntry(carol, { title: "Game 2", ...options });
    for (const game of [game1, game2]) {
      await tournamentService.addTournamentEntry(event.get("id"), game.get("id"));
    }
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await db.knex("entry_score").delete();
    await db.knex("tournament_score").delete();
    await submitHighScore(alice, game1, 100, PROOF);
    await waitForTournamentRefresh(); // Avoid concurrent refreshes
    await submitHighScore(bob, game1, 50, PROOF);
    await waitForTournamentRefresh(); // Avoid concurrent refreshes
    await submitHighScore(alice, game2, 100, PROOF);
    await waitForTournamentRefresh(); // Avoid concurrent refreshes
    await submitHighScore(carol, game2, 50, PROOF);
    await waitForTournamentRefresh(); // Avoid concurrent refreshes
  });

  describe("removing high scores", () => {

    it("should drop the medal of a game when its last score of the user is deleted", async () => {
      expect(await getEntryScores(alice)).to.have.keys(String(game1.get("id")), String(game2.get("id")));

      const score = await highscoreService.findEntryScore(alice.id, game1.get("id"));
      await highscoreService.deleteEntryScore(score, game1);
      await waitForTournamentRefresh();

      expect(await getEntryScores(alice)).to.have.keys(String(game2.get("id")));
      expect((await getEntryScores(bob))[game1.get("id")].ranking).to.equal(1);
    });

    it("should remove the user from the leaderboard when deleting his only score", async () => {
      const score = await highscoreService.findEntryScore(carol.id, game2.get("id"));
      await highscoreService.deleteEntryScore(score, game2);
      await waitForTournamentRefresh();

      expect(await getEntryScores(carol)).to.deep.equal({});
      expect(await db.knex("tournament_score").where("user_id", carol.id).first()).to.equal(undefined);
    });

    it("should clear the medals of a game when all its scores are deleted", async () => {
      await highscoreService.deleteAllEntryScores(game1);
      await waitForTournamentRefresh();

      expect(await getEntryScores(alice)).to.have.keys(String(game2.get("id")));
      expect(await getEntryScores(bob)).to.deep.equal({});
    });

  });

  describe("concurrent refreshes", () => {

    it("should not create duplicate tournament scores for a user", async () => {
      const event = await tournamentService.findActiveTournamentPlaying(game1.get("id"));
      await db.knex("tournament_score").delete();

      await Promise.all([
        tournamentService.refreshTournamentScores(event, alice.id),
        tournamentService.refreshTournamentScores(event, alice.id)
      ]);

      expect(await db.knex("tournament_score").where("user_id", alice.id)).to.have.length(1);
    });

  });

  async function getEntryScores(user: User): Promise<Record<string, { ranking?: number; score: number }>> {
    const row = await db.knex("tournament_score").where("user_id", user.id).first();
    return row ? JSON.parse(row.entry_scores) : {};
  }

  /** Listener refreshes are fire-and-forget */
  async function waitForTournamentRefresh(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
});
