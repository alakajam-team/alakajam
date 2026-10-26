/* eslint-disable @typescript-eslint/no-unused-expressions */

import { BookshelfCollection, EntryBookshelfModel } from "bookshelf";
import { expect } from "chai";
import enums from "server/core/enums";
import security from "server/core/security";
import entryService from "server/entry/entry.service";
import postService from "server/post/post.service";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import {
  createTestEntry,
  createTestEvent,
  createTestPost,
  createTestPostAndEntryWithSameId,
  createTestUser
} from "server/testing/testing-fixtures";
import { afterAll, beforeAll, describe, it } from "vitest";
import teamInviteService from "./team-invite.service";
import teamService from "./team.service";

describe("Team service", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("find team members", () => {

    it("should list the owner, members and invites of an entry", async () => {
      const owner = await createTestUser({ title: "Owner" });
      const member = await createTestUser({ title: "Member" });
      const invitee = await createTestUser({ title: "Invitee" });
      const entry = await createTestEntry(owner, undefined, { division: enums.DIVISION.TEAM });
      await security.addUserRight(member, entry, "entry", "write");
      await teamService.setTeamMembers(owner, entry, ids(owner, member, invitee));

      const members = await teamService.findTeamMembers(await reloadEntry(entry));

      expect(members.map(({ id, text, locked, invite }) => ({ id, text, locked, invite }))).to.deep.equal([
        { id: owner.id, text: "Owner", locked: true, invite: false },
        { id: member.id, text: "Member", locked: false, invite: false },
        { id: invitee.id, text: "Invitee", locked: false, invite: true },
      ]);
    });

    it("should only list the current user for a new entry", async () => {
      const user = await createTestUser({ title: "Creator" });

      const members = await teamService.findTeamMembers(undefined, user);

      expect(members.map(({ id, locked, invite }) => ({ id, locked, invite }))).to.deep.equal([
        { id: user.id, locked: true, invite: false }
      ]);
    });

    it("should not list users with roles on a post sharing the same ID", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const { entry } = await createTestPostAndEntryWithSameId(postAuthor, entryOwner);

      const members = await teamService.findTeamMembers(await reloadEntry(entry));

      expect(members.map((m) => m.id)).to.deep.equal([entryOwner.id]);
    });

  });

  describe("set team members", () => {

    it("should invite new members", async () => {
      const owner = await createTestUser();
      const invitee1 = await createTestUser();
      const invitee2 = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(owner, event, { division: enums.DIVISION.TEAM });

      const result = await teamService.setTeamMembers(owner, entry, ids(owner, invitee1, invitee2));

      expect(result.numAdded).to.equal(2);
      expect(result.numRemoved).to.equal(0);
      expect(await findInvitedEntryIds(invitee1)).to.deep.equal([entry.get("id")]);
      expect(await findInvitedEntryIds(invitee2)).to.deep.equal([entry.get("id")]);
      // Invites don't grant any rights until accepted
      expect(security.canUserWrite(invitee1, await reloadEntry(entry))).to.be.false;
    });

    it("should remove members and invites not in the list", async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const removedMember = await createTestUser();
      const removedInvitee = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(owner, event, { division: enums.DIVISION.TEAM });
      await security.addUserRight(member, entry, "entry", "write");
      await security.addUserRight(removedMember, entry, "entry", "write");
      await teamService.setTeamMembers(owner, entry, ids(owner, member, removedMember, removedInvitee));

      const result = await teamService.setTeamMembers(owner, entry, ids(owner, member));

      expect(result.numRemoved).to.equal(2);
      const reloadedEntry = await reloadEntry(entry);
      expect(security.canUserManage(owner, reloadedEntry)).to.be.true;
      expect(security.canUserWrite(member, reloadedEntry)).to.be.true;
      expect(security.canUserWrite(removedMember, reloadedEntry)).to.be.false;
      expect(await findInvitedEntryIds(removedInvitee)).to.deep.equal([]);
      expect((await entryService.findUserEntries(removedMember)).length).to.equal(0);
    });

    it("should report users who already entered the event with another entry", async () => {
      const owner = await createTestUser();
      const otherOwner = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(owner, event, { division: enums.DIVISION.TEAM });
      const otherEntry = await createTestEntry(otherOwner, event, { division: enums.DIVISION.TEAM });

      const result = await teamService.setTeamMembers(owner, entry, ids(owner, otherOwner));

      expect(result.numAdded).to.equal(0);
      const alreadyEnteredOther = result.alreadyEntered.filter((row) => row.user_id as any === otherOwner.id);
      expect(alreadyEnteredOther.map((row) => row.node_id)).to.deep.equal([otherEntry.get("id")]);
      expect(await findInvitedEntryIds(otherOwner)).to.deep.equal([]);
    });

    it("should only keep the owner on solo entries", async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const invitee = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(owner, event, { division: enums.DIVISION.TEAM });
      await security.addUserRight(member, entry, "entry", "write");
      await teamService.setTeamMembers(owner, entry, ids(owner, member, invitee));
      await entry.save({ division: enums.DIVISION.SOLO }, { patch: true });

      const result = await teamService.setTeamMembers(owner, entry, ids(owner, member, invitee));

      expect(result.numRemoved).to.equal(1);
      const reloadedEntry = await reloadEntry(entry);
      expect(reloadedEntry.related<BookshelfCollection>("userRoles").map((role) => role.get("user_id")))
        .to.deep.equal([owner.id]);
      expect(await findInvitedEntryIds(invitee)).to.deep.equal([]);
    });

    it("should not touch roles of a post sharing the same ID", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const postWriter = await createTestUser();
      const { post, entry } = await createTestPostAndEntryWithSameId(postAuthor, entryOwner);
      await security.addUserRight(postWriter, post, "post", "write");

      await entry.save({ division: enums.DIVISION.TEAM }, { patch: true });
      await teamService.setTeamMembers(entryOwner, entry, ids(entryOwner));
      await entry.save({ division: enums.DIVISION.SOLO }, { patch: true });
      await teamService.setTeamMembers(entryOwner, entry, ids(entryOwner));

      const fetchedPost = await postService.findPostById(post.get("id"));
      expect(security.canUserManage(postAuthor, fetchedPost)).to.be.true;
      expect(security.canUserWrite(postWriter, fetchedPost)).to.be.true;
    });

    it("should detach posts of removed members from the entry", async () => {
      const owner = await createTestUser();
      const member = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(owner, event, { division: enums.DIVISION.TEAM });
      await security.addUserRight(member, entry, "entry", "write");
      const ownerPost = await createTestPost(owner, { entry_id: entry.get("id") }, { eventId: event.get("id") });
      const memberPost = await createTestPost(member, { entry_id: entry.get("id") }, { eventId: event.get("id") });

      await teamService.setTeamMembers(owner, entry, ids(owner));

      // Posts are detached asynchronously
      await waitUntil(async () => !(await postService.findPostById(memberPost.get("id"))).get("entry_id"));
      expect((await postService.findPostById(ownerPost.get("id"))).get("entry_id")).to.equal(entry.get("id"));
    });

  });

  describe("search for team members", () => {

    it("should tell which users already entered the event", async () => {
      const entered = await createTestUser({ name: "searchentered" });
      const notEntered = await createTestUser({ name: "searchnotentered" });
      const event = await createTestEvent();
      const entry = await createTestEntry(entered, event);
      const otherEvent = await createTestEvent();
      await createTestEntry(notEntered, otherEvent);

      const results = await teamService.searchForTeamMembers("search", event.get("id"));

      expect(results.find((r) => r.id === entered.id)?.node_id).to.equal(entry.get("id"));
      expect(results.find((r) => r.id === notEntered.id)?.node_id).to.not.be.ok;
    });

    it("should tell which users are in the external entry", async () => {
      const member = await createTestUser({ name: "externalmember" });
      const other = await createTestUser({ name: "externalother" });
      const entry = await createTestEntry(member);
      await createTestEntry(other);

      const results = await teamService.searchForTeamMembers("external", undefined, entry);

      expect(results.find((r) => r.id === member.id)?.node_id).to.equal(entry.get("id"));
      expect(results.find((r) => r.id === other.id)?.node_id).to.not.be.ok;
    });

    it("should ignore roles on posts", async () => {
      const postAuthor = await createTestUser({ name: "postsearchauthor" });
      const entryOwner = await createTestUser({ name: "postsearchowner" });
      const event = await createTestEvent();
      const { entry } = await createTestPostAndEntryWithSameId(postAuthor, entryOwner);
      await postService.createPost(postAuthor, event.get("id"));

      const eventResults = await teamService.searchForTeamMembers("postsearch", event.get("id"));
      expect(eventResults.find((r) => r.id === postAuthor.id)?.node_id).to.not.be.ok;

      const entryResults = await teamService.searchForTeamMembers("postsearch", undefined, entry);
      expect(entryResults.find((r) => r.id === postAuthor.id)?.node_id).to.not.be.ok;
      expect(entryResults.find((r) => r.id === entryOwner.id)?.node_id).to.equal(entry.get("id"));
    });

  });

  describe("team invites", () => {

    it("should find the invites of a user", async () => {
      const owner = await createTestUser();
      const invitee = await createTestUser();
      const entry = await createTestEntry(owner, await createTestEvent(), { division: enums.DIVISION.TEAM });
      await teamService.setTeamMembers(owner, entry, ids(owner, invitee));

      const invites = await teamInviteService.findEntryInvitesForUser(invitee);

      expect(invites.length).to.equal(1);
      expect(invites.at(0).get("entry_id")).to.equal(entry.get("id"));
      expect(invites.at(0).get("permission")).to.equal("write");
    });

    it("should create a write role when accepting an invite", async () => {
      const owner = await createTestUser();
      const invitee = await createTestUser();
      const event = await createTestEvent();
      const entry = await createTestEntry(owner, event, { division: enums.DIVISION.TEAM });
      await teamService.setTeamMembers(owner, entry, ids(owner, invitee));

      await teamInviteService.acceptInvite(invitee, entry);

      const reloadedEntry = await reloadEntry(entry);
      expect(security.canUserWrite(invitee, reloadedEntry)).to.be.true;
      expect(security.canUserManage(invitee, reloadedEntry)).to.be.false;
      const inviteeRole = reloadedEntry.related<BookshelfCollection>("userRoles").find((role) => role.get("user_id") === invitee.id);
      expect(inviteeRole.get("event_id")).to.equal(event.get("id"));
      expect(await findInvitedEntryIds(invitee)).to.deep.equal([]);
      expect((await entryService.findUserEntryForEvent(invitee, event.get("id"))).get("id")).to.equal(entry.get("id"));
    });

    it("should clear other invites from the same event and attach the user's posts when accepting", async () => {
      const owner1 = await createTestUser();
      const owner2 = await createTestUser();
      const invitee = await createTestUser();
      const event = await createTestEvent();
      const otherEvent = await createTestEvent();
      const entry1 = await createTestEntry(owner1, event, { division: enums.DIVISION.TEAM });
      const entry2 = await createTestEntry(owner2, event, { division: enums.DIVISION.TEAM });
      const otherEventEntry = await createTestEntry(owner2, otherEvent, { division: enums.DIVISION.TEAM });
      await teamService.setTeamMembers(owner1, entry1, ids(owner1, invitee));
      await teamService.setTeamMembers(owner2, entry2, ids(owner2, invitee));
      await teamService.setTeamMembers(owner2, otherEventEntry, ids(owner2, invitee));
      const inviteePost = await createTestPost(invitee, {}, { eventId: event.get("id") });

      await teamInviteService.acceptInvite(invitee, entry1);

      expect(await findInvitedEntryIds(invitee)).to.deep.equal([otherEventEntry.get("id")]);
      expect((await postService.findPostById(inviteePost.get("id"))).get("entry_id")).to.equal(entry1.get("id"));
    });

    it("should promote an existing role when accepting an invite for a higher permission", async () => {
      const owner = await createTestUser();
      const invitee = await createTestUser();
      const entry = await createTestEntry(owner, undefined, { division: enums.DIVISION.TEAM });
      await teamService.setTeamMembers(owner, entry, ids(owner, invitee));
      await security.addUserRight(invitee, entry, "entry", "read");

      await teamInviteService.acceptInvite(invitee, entry);

      const reloadedEntry = await reloadEntry(entry);
      const inviteeRoles = reloadedEntry.related<BookshelfCollection>("userRoles").filter((role) => role.get("user_id") === invitee.id);
      expect(inviteeRoles.map((role) => role.get("permission"))).to.deep.equal(["write"]);
    });

    it("should not create a role when accepting an invite to a solo entry", async () => {
      const owner = await createTestUser();
      const invitee = await createTestUser();
      const entry = await createTestEntry(owner, await createTestEvent(), { division: enums.DIVISION.TEAM });
      await teamService.setTeamMembers(owner, entry, ids(owner, invitee));
      await entry.save({ division: enums.DIVISION.SOLO }, { patch: true });

      await teamInviteService.acceptInvite(invitee, entry);

      expect(security.canUserWrite(invitee, await reloadEntry(entry))).to.be.false;
      expect(await findInvitedEntryIds(invitee)).to.deep.equal([]);
    });

    it("should not create a role without an invite", async () => {
      const owner = await createTestUser();
      const user = await createTestUser();
      const entry = await createTestEntry(owner, undefined, { division: enums.DIVISION.TEAM });

      await teamInviteService.acceptInvite(user, entry);

      expect(security.canUserWrite(user, await reloadEntry(entry))).to.be.false;
    });

    it("should delete the invite when declining", async () => {
      const owner = await createTestUser();
      const invitee = await createTestUser();
      const entry = await createTestEntry(owner, undefined, { division: enums.DIVISION.TEAM });
      await teamService.setTeamMembers(owner, entry, ids(owner, invitee));

      await teamInviteService.deleteInvite(invitee, entry);

      expect(await findInvitedEntryIds(invitee)).to.deep.equal([]);
      expect(security.canUserWrite(invitee, await reloadEntry(entry))).to.be.false;
    });

    it("should only create a role on the entry, not on a post sharing the same ID", async () => {
      const postAuthor = await createTestUser();
      const entryOwner = await createTestUser();
      const invitee = await createTestUser();
      const { post, entry } = await createTestPostAndEntryWithSameId(postAuthor, entryOwner);
      await entry.save({ division: enums.DIVISION.TEAM }, { patch: true });
      await teamService.setTeamMembers(entryOwner, entry, ids(entryOwner, invitee));

      await teamInviteService.acceptInvite(invitee, entry);

      expect(security.canUserWrite(invitee, await reloadEntry(entry))).to.be.true;
      expect(security.canUserWrite(invitee, await postService.findPostById(post.get("id")))).to.be.false;
    });

  });

  function ids(...users: Array<{ id: number }>): number[] {
    return users.map((user) => user.id);
  }

  function reloadEntry(entry: EntryBookshelfModel): Promise<EntryBookshelfModel> {
    return entryService.findEntryById(entry.get("id"));
  }

  async function findInvitedEntryIds(user: { id: number; get(key: string): any }): Promise<number[]> {
    const invites = await teamInviteService.findEntryInvitesForUser(user as any);
    return invites.map((invite) => invite.get("entry_id")).sort();
  }

  async function waitUntil(condition: () => Promise<boolean>, timeoutMs = 2000): Promise<void> {
    const start = Date.now();
    while (!(await condition())) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("Timed out waiting for condition");
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

});
