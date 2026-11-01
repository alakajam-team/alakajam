import { expect } from "chai";
import db from "server/core/db";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import { createTestEvent, createTestUser } from "server/testing/testing-fixtures";
import userService from "server/user/user.service";
import { afterAll, beforeAll, describe, it } from "vitest";
import eventService from "./event.service";

describe("Event service", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("set event moderators", () => {

    it("should add and remove event roles", async () => {
      const event = await createTestEvent();
      const mod1 = await createTestUser({ is_mod: "true" });
      const mod2 = await createTestUser({ is_mod: "true" });

      await eventService.setEventModerators(event, [mod1.id, mod2.id]);
      expect(await findModeratorIds(event.get("id"))).to.have.members([mod1.id, mod2.id]);

      await eventService.setEventModerators(event, [mod2.id]);
      expect(await findModeratorIds(event.get("id"))).to.deep.equal([mod2.id]);
    });

    it("should promote non-mods and return them", async () => {
      const event = await createTestEvent();
      const mod = await createTestUser({ is_mod: "true" });
      const user = await createTestUser();

      const promotedUsers = await eventService.setEventModerators(event, [mod.id, user.id]);

      expect(promotedUsers.map(promoted => promoted.id)).to.deep.equal([user.id]);
      expect((await userService.findById(user.id)).is_mod).to.equal("true");
    });

  });

});

async function findModeratorIds(eventId: number): Promise<number[]> {
  return db.knex("event_role").where("event_id", eventId).pluck("user_id");
}
