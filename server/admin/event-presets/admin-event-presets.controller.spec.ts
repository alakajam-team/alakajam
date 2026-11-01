/* eslint-disable @typescript-eslint/no-unused-expressions */

import { expect } from "chai";
import enums from "server/core/enums";
import eventPresetService from "server/event/manage/settings/event-preset.service";
import { mockRequest, mockResponse } from "server/testing/mocks";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import { createTestEvent, createTestPreset } from "server/testing/testing-fixtures";
import { afterAll, beforeAll, describe, it } from "vitest";
import { adminEventPresets, AdminEventPresetsContext } from "./admin-event-presets.controller";

describe("Admin event presets controller", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("creation", () => {

    it("should save a preset with its state and countdown offset in milliseconds", async () => {
      const title = uniqueTitle();

      await submit({ ...validForm(), title, "countdown-offset-d": "2", "countdown-offset-h": "3", "countdown-offset-m": "15" });

      const preset = await findPresetByTitle(title);
      expect(preset.get("status_entry")).to.equal(enums.EVENT.STATUS_ENTRY.OPEN);
      expect(preset.get("countdown_config")).to.deep.include({
        message: "Submit your game",
        phrase: "ends",
        enabled: true,
        offset: ((2 * 24 + 3) * 60 + 15) * 60000
      });
    });

    it("should not save a preset without a title", async () => {
      const presetCountBefore = (await eventPresetService.findEventPresets()).length;

      await submit({ ...validForm(), title: "" });

      expect((await eventPresetService.findEventPresets()).length).to.equal(presetCountBefore);
    });

    it("should tell the user that the title is required", async () => {
      const res = await submit({ ...validForm(), title: "" });

      expect(renderContext(res).errorMessage).to.equal("Title is required");
    });

    it("should reject an invalid countdown offset", async () => {
      const title = uniqueTitle();

      const res = await submit({ ...validForm(), title, "countdown-offset-d": "two" });

      expect(renderContext(res).errorMessage).to.equal("Invalid deadline offset from start");
      expect(await findPresetByTitle(title)).to.be.undefined;
    });

    it("should reject invalid statuses", async () => {
      const title = uniqueTitle();

      await submit({ ...validForm(), title, "status-entry": "not-a-status" });

      expect(await findPresetByTitle(title)).to.be.undefined;
    });

  });

  describe("edition", () => {

    it("should display the saved countdown offset as days, hours and minutes", async () => {
      const preset = await createTestPreset({
        countdown_config: { offset: ((2 * 24 + 3) * 60 + 15) * 60000 }
      });

      const res = await view({ edit: preset.get("id").toString() });

      expect(renderContext(res).countdownOffset).to.deep.equal({ d: 2, h: 3, m: 15 });
    });

    it("should round-trip negative offsets", async () => {
      const title = uniqueTitle();
      await submit({ ...validForm(), title, "countdown-offset-d": "-1", "countdown-offset-h": "-2", "countdown-offset-m": "-30" });
      const preset = await findPresetByTitle(title);
      expect(preset.get("countdown_config").offset).to.equal(-((24 + 2) * 60 + 30) * 60000);

      const res = await view({ edit: preset.get("id").toString() });

      expect(renderContext(res).countdownOffset).to.deep.equal({ d: -1, h: -2, m: -30 });
    });

    it("should leave unset statuses empty, so that applying the preset keeps them unchanged", async () => {
      const title = uniqueTitle();
      const form = validForm();
      delete form["status-tournament"];

      await submit({ ...form, title });

      expect((await findPresetByTitle(title)).get("status_tournament")).to.be.null;
    });

    it("should ignore unknown preset IDs", async () => {
      const res = await view({ edit: "999999" });

      expect(renderContext(res).editEventPreset).not.to.be.ok;
    });

    it("should prefill a copy of a reference preset", async () => {
      const reference = await createTestPreset({ title: "Theme voting" });

      const res = await view({ create: "", reference: reference.get("id").toString() });

      const editEventPreset = renderContext(res).editEventPreset;
      expect(editEventPreset.get("id")).to.be.null;
      expect(editEventPreset.get("title")).to.equal("Theme voting (copy)");
    });

  });

  describe("deletion", () => {

    it("should delete an unused preset", async () => {
      const preset = await createTestPreset();

      await submit({ id: preset.get("id").toString(), delete: "" });

      expect(await findPresetByTitle(preset.get("title"))).to.be.undefined;
    });

    it("should report an error when deleting a preset used by an event", async () => {
      const preset = await createTestPreset();
      await createTestEvent({ event_preset_id: preset.get("id") });

      const res = await submit({ id: preset.get("id").toString(), delete: "" });

      expect(renderContext(res).errorMessage).to.contain("Cannot delete preset");
    });

  });

});

let titleCounter = 0;

function uniqueTitle(): string {
  return `Admin preset ${++titleCounter}`;
}

function validForm(): Record<string, string> {
  return {
    "title": uniqueTitle(),
    "status": enums.EVENT.STATUS.OPEN,
    "status-rules": enums.EVENT.STATUS_RULES.OFF,
    "status-theme": enums.EVENT.STATUS_THEME.RESULTS,
    "status-entry": enums.EVENT.STATUS_ENTRY.OPEN,
    "status-results": enums.EVENT.STATUS_RESULTS.DISABLED,
    "status-tournament": enums.EVENT.STATUS_TOURNAMENT.DISABLED,
    "countdown-message": "Submit your game",
    "countdown-link": "create-entry",
    "countdown-phrase": "ends",
    "countdown-enabled": "on",
    "countdown-offset-d": "0",
    "countdown-offset-h": "0",
    "countdown-offset-m": "0"
  };
}

async function submit(body: Record<string, string>) {
  const res = mockResponse();
  await adminEventPresets(mockRequest({ method: "POST", query: {}, body }), res);
  return res;
}

async function view(query: Record<string, string>) {
  const res = mockResponse();
  await adminEventPresets(mockRequest({ method: "GET", query, body: {} }), res);
  return res;
}

function renderContext(res: ReturnType<typeof mockResponse>): AdminEventPresetsContext & { errorMessage?: string } {
  return res.renderSpy.firstCall.args[1];
}

async function findPresetByTitle(title: string) {
  const presets = await eventPresetService.findEventPresets();
  return presets.models.find((preset) => preset.get("title") === title);
}
