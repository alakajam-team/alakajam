/* eslint-disable @typescript-eslint/no-unused-expressions */

import { expect } from "chai";
import enums from "server/core/enums";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import { createTestEvent, createTestPreset, TEST_PRESET_OFFSET_MS } from "server/testing/testing-fixtures";
import { afterAll, beforeAll, describe, it } from "vitest";
import eventPresetService from "./event-preset.service";

describe("Event preset service", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("initEventPreset", () => {

    it("should create an empty unpersisted preset", () => {
      const preset = eventPresetService.initEventPreset();

      expect(preset.get("id")).to.be.undefined;
      expect(preset.get("countdown_config")).to.deep.equal({});
    });

    it("should clone a reference preset under a new title", async () => {
      const reference = await createTestPreset({ title: "Jam started" });

      const copy = eventPresetService.initEventPreset(reference);

      expect(copy.get("id")).to.be.null;
      expect(copy.get("title")).to.equal("Jam started (copy)");
      expect(copy.get("status_entry")).to.equal(enums.EVENT.STATUS_ENTRY.OPEN);
      expect(copy.get("countdown_config").message).to.equal("Submit your game");
      expect(copy.get("countdown_config").offset).to.equal(TEST_PRESET_OFFSET_MS);
    });

    it("should persist a clone as a separate preset", async () => {
      const reference = await createTestPreset();

      const copy = eventPresetService.initEventPreset(reference);
      await copy.save();

      expect(copy.get("id")).to.be.a("number");
      expect(copy.get("id")).not.to.equal(reference.get("id"));
    });

    it("should not share the countdown config object with the reference", async () => {
      const reference = await createTestPreset();

      const copy = eventPresetService.initEventPreset(reference);
      copy.get("countdown_config").message = "Changed";

      expect(reference.get("countdown_config").message).to.equal("Submit your game");
    });

  });

  describe("findEventPresets", () => {

    it("should list presets ordered by title", async () => {
      await createTestPreset({ title: "ZZZ last preset" });
      await createTestPreset({ title: "AAA first preset" });

      const presets = await eventPresetService.findEventPresets();
      const titles = presets.models.map((preset) => preset.get("title"));

      expect(titles).to.deep.equal([...titles].sort());
      expect(titles).to.include.members(["AAA first preset", "ZZZ last preset"]);
    });

  });

  describe("findEventPresetById", () => {

    it("should load a preset with its events", async () => {
      const preset = await createTestPreset();
      const event = await createTestEvent({ event_preset_id: preset.get("id") });

      const found = await eventPresetService.findEventPresetById(preset.get("id"));

      expect(found.get("title")).to.equal(preset.get("title"));
      expect(found.get("countdown_config").offset).to.equal(TEST_PRESET_OFFSET_MS);
      expect(found.related<any>("events").map((e) => e.get("id"))).to.deep.equal([event.get("id")]);
    });

  });

  describe("isValidEventPresetId", () => {

    it("should only accept IDs of existing presets", async () => {
      const preset = await createTestPreset();

      expect(await eventPresetService.isValidEventPresetId(preset.get("id").toString())).to.be.true;
      expect(await eventPresetService.isValidEventPresetId("999999")).to.be.false;
      expect(await eventPresetService.isValidEventPresetId("not-an-id")).to.be.false;
    });

  });

  describe("event relation", () => {

    it("should load the preset of an event", async () => {
      const preset = await createTestPreset();
      const event = await createTestEvent({ event_preset_id: preset.get("id") });

      await event.load("preset");

      expect(event.related<any>("preset").get("title")).to.equal(preset.get("title"));
    });

  });

  describe("deleteEventPreset", () => {

    it("should delete an unused preset", async () => {
      const preset = await createTestPreset();
      const presetId = preset.get("id");

      await eventPresetService.deleteEventPreset(preset);

      expect(await eventPresetService.findEventPresetById(presetId)).to.be.null;
    });

    it("should refuse to delete a preset used by an event", async () => {
      const preset = await createTestPreset({ title: "Used preset" });
      await createTestEvent({ event_preset_id: preset.get("id") });

      let error: Error;
      try {
        await eventPresetService.deleteEventPreset(preset);
      } catch (e) {
        error = e;
      }

      expect(error?.message).to.equal("Cannot delete preset Used preset because 1 events depend on it");
      expect(await eventPresetService.findEventPresetById(preset.get("id"))).not.to.be.null;
    });

  });

});
