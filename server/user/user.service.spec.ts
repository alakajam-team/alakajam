/* eslint-disable no-unused-expressions */

import { expect } from "chai";
import constants from "server/core/constants";
import { EventParticipation } from "server/entity/event-participation.entity";
import { Event } from "server/entity/event.entity";
import { UserRole } from "server/entity/user-role.entity";
import { User } from "server/entity/user.entity";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import { getRepository } from "typeorm";
import userService from "./user.service";

describe("User service", function() {
  this.timeout(DB_TEST_TIMEOUT);

  before(async () => {
    await startTestDB();
  });

  beforeEach(() => {
    // XXX Date should be reset before each test
  });

  after(async () => {
    await closeTestDB();
  });

  describe("find by name", () => {

    it("should return a user when searching a valid name", async () => {
      const result = await userService.findByName("administrator");

      expect(result).to.be.ok;
    });

  });


  describe("find users", () => {

    it("should search users by partial, case-insensitive title", async () => {
      await createUser({ title: "Dumbledore" });

      const foundUsers = await userService.findUsers({ search: "dumb" });
      expect(foundUsers.length).to.equal(1);
      expect(foundUsers[0].title).to.equal("Dumbledore");
    });

    it("should not retrieve the anonymous comment user", async () => {
      const anonymousUser = await userService.findById(constants.ANONYMOUS_USER_ID);
      expect(anonymousUser).to.exist;
      expect(anonymousUser.title).not.to.be.empty;

      const foundUsers = await userService.findUsers({ search: anonymousUser.title });
      expect(foundUsers.length).to.equal(0);
    });

    it("should find users who entered a specific event", async () => {
      const user = await createUser();
      await createEventParticipation(user, 1);

      const foundUsers = await userService.findUsers({ eventId: 1 });
      expect(foundUsers.length).to.equal(1);
    });

    it("should count user entries", async () => {
      const user = await createUser({ title: "Harry Potter" });
      await createUserRole(user, { event_id: undefined });
      await createUserRole(user, { event_id: 1 });
      await createUserRole(user, { event_id: 2 });

      const foundUsersWithEntryCounts = await userService.findUsers({
        search: "harry",
        entriesCount: true
      });
      expect(foundUsersWithEntryCounts.length).to.equal(1);
      expect(foundUsersWithEntryCounts[0].entriesCount).to.equal(3);
      expect(foundUsersWithEntryCounts[0].akjEntriesCount).to.equal(2);
    });

    it("should filter out users without entries", async () => {
      await createUser({ title: "Gandalf" });

      const foundUsers = await userService.findUsers({
        search: "gandalf",
        entriesCount: true,
        withEntries: true
      });
      expect(foundUsers.length).to.equal(0);
    });

    it("should find mods", async () => {
      await createUser({ is_mod: "1" });

      const foundMods = await userService.findUsers({ isMod: true });
      expect(foundMods.length).to.equal(1);
    });

    it("should find admins", async () => {
      const foundAdmins = await userService.findUsers({ isAdmin: true });
      expect(foundAdmins.length).to.equal(1);
      expect(foundAdmins[0].name).to.equal("administrator");
    });

    it("should count users", async () => {
      await createUser({ title: "entrant1" });
      await createUser({ title: "entrant2" });
      await createUser({ title: "entrant3" });

      const foundUsersCount = await userService.countUsers({ search: "entrant" });
      expect(foundUsersCount).to.equal(3);
    });

    it("should support pagination sorting by creation date", async () => {
      await createUser({ title: "A Paginateme", created_at: 1000 as any });
      await createUser({ title: "B Paginateme", created_at: 2000 as any });
      await createUser({ title: "C Paginateme", created_at: 3000 as any });

      // TODO Fix date, currently requires timestamp number to be updated correctly (at least on SQLite)
      // const test = await await userService.findUsers({search: "Paginate"}) as BookshelfCollection;

      const foundUsers = await userService.findUsers({
        search: "Paginateme",
        pageSize: 1,
        page: 2
      });
      expect(foundUsers.length).to.equal(1);
      expect(foundUsers[0].title).to.equal("B Paginateme");
    });

    it("should support ordering", async () => {
      await createUser({ title: "B Orderme" });
      await createUser({ title: "A Orderme" });
      await createUser({ title: "C Orderme" });

      const foundUsers = await userService.findUsers({
        search: "orderme",
        orderBy: "title",
        orderByDesc: true
      });
      expect(foundUsers.map(user => user.get("title")).join(", "))
        .to.equal("C Orderme, B Orderme, A Orderme");
    });

  });


  describe("register", () => {

    it("should reject invalid usernames", async () => {
      const result = await userService.register("email@example.com", "xx", "password");

      expect(result).to.be.a("string");
      expect(result).to.contain("Username is invalid");
    });

  });


  describe("refresh references", () => {

    it("should refresh user roles when user title changes", async () => {
      const user = await createUser();
      const userRole = await createUserRole(user);

      user.title = "New title";
      await userService.save(user);
      await userService.refreshUserReferences(user);

      const updatedUserRole = await findUserRole(userRole.id);
      expect(updatedUserRole.user_title).to.equal("New title");
    });

  });


  let createdUsers = 0;

  async function createUser(attributes: Partial<User> = {}): Promise<User> {
    const user = await userService.register(
      attributes.email || `test${createdUsers++}@example.com`,
      attributes.name || "user" + (createdUsers++).toString(),
      "testtest");
    if (typeof user === "string") { throw new Error(user); }

    // Support overriding created_at/updated_at
    if (Object.keys(attributes).length > 0) {
      await getRepository(User)
        .createQueryBuilder()
        .update()
        .set(attributes)
        .where({ id: user.id })
        .execute();
    }

    return user;
  }

  function createUserRole(user: User, attributes: Partial<UserRole> = {}): Promise<UserRole> {
    const userRole = new UserRole();
    userRole.node_id = 1;
    userRole.node_type = "entry";
    userRole.user_id = user.id;
    userRole.user_name = user.name;
    userRole.user_title = user.title;
    userRole.permission = "manage";
    Object.assign(userRole, attributes);

    const userRoleRepository = getRepository(UserRole);
    return userRoleRepository.save(userRole);
  }

  async function createEventParticipation(user: User, eventId: number, attributes: Partial<EventParticipation> = {}): Promise<EventParticipation> {
    await createEventIfMissing(eventId);

    const ep = new EventParticipation(eventId, user.id);
    Object.assign(ep, attributes);

    const epRepository = getRepository(EventParticipation);
    return epRepository.save(ep);
  }

  async function createEventIfMissing(eventId: number): Promise<void> {
    const eventRepository = getRepository(Event);
    const existingEvent = await eventRepository.findOne({ where: { id: eventId } });
    if (!existingEvent) {
      const event = new Event();
      event.id = eventId;
      event.name = "test";
      event.title = "test";
      event.status = "open";
      event.status_theme = "disabled";
      event.status_entry = "disabled";
      event.status_rules = "disabled";
      event.status_results = "disabled";
      event.status_tournament = "disabled";
      await eventRepository.save(event);
    }
  }

  function findUserRole(userRoleId: number): Promise<UserRole> {
    const userRoleRepository = getRepository(UserRole);
    return userRoleRepository.findOne(userRoleId);
  }

});
