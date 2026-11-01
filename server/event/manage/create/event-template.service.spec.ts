/* eslint-disable @typescript-eslint/no-unused-expressions */


import { expect } from "chai";
import { BookshelfModel } from "bookshelf";
import enums from "server/core/enums";
import eventService from "server/event/event.service";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import { createTestPreset, createTestTemplate } from "server/testing/testing-fixtures";
import { afterAll, beforeAll, describe, it } from "vitest";
import eventTemplateService from "./event-template.service";

describe("Event template service", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("persistence", () => {

    it("should round-trip JSON fields", async () => {
      const preset = await createTestPreset();
      const template = await createTestTemplate({
        event_title: "Alakajam #42",
        event_preset_id: preset.get("id"),
        links: [{ title: "Rules", link: "/post/1", icon: "fa-question-circle" }],
        divisions: { solo: "48 hours" },
        category_titles: ["Overall", "Graphics"]
      });

      const found = await eventTemplateService.findEventTemplateById(template.get("id"));

      expect(found.get("event_title")).to.equal("Alakajam #42");
      expect(found.get("event_preset_id")).to.equal(preset.get("id"));
      expect(found.get("links")).to.deep.equal([{ title: "Rules", link: "/post/1", icon: "fa-question-circle" }]);
      expect(found.get("divisions")).to.deep.equal({ solo: "48 hours" });
      expect(found.get("category_titles")).to.deep.equal(["Overall", "Graphics"]);
    });

    it("should load the template preset", async () => {
      const preset = await createTestPreset();
      const template = await createTestTemplate({ event_preset_id: preset.get("id") });

      await template.load("preset");

      expect(template.related<BookshelfModel>("preset").get("title")).to.equal(preset.get("title"));
    });

    it("should list templates ordered by title", async () => {
      await createTestTemplate({ title: "ZZZ last template" });
      await createTestTemplate({ title: "AAA first template" });

      const templates = await eventTemplateService.findEventTemplates();
      const titles = templates.models.map((template) => template.get("title"));

      expect(titles).to.deep.equal([...titles].sort());
    });

    it("should delete a template", async () => {
      const template = await createTestTemplate();
      const templateId = template.get("id");

      await eventTemplateService.deleteEventTemplate(template);

      expect(await eventTemplateService.findEventTemplateById(templateId)).to.be.null;
    });

  });

  describe("event creation from a template", () => {

    it("should apply the template defaults to the new event", async () => {
      const preset = await createTestPreset();
      const template = await createTestTemplate({
        event_title: "Alakajam #42",
        event_preset_id: preset.get("id"),
        links: [{ title: "Rules", link: "/post/1" }],
        divisions: { solo: "48 hours" },
        category_titles: ["Overall"]
      });

      const event = eventService.createEvent(template);

      expect(event.get("title")).to.equal("Alakajam #42");
      expect(event.get("event_preset_id")).to.equal(preset.get("id"));
      expect(event.get("divisions")).to.deep.equal({ solo: "48 hours" });
      expect(event.related<BookshelfModel>("details").get("links")).to.deep.equal([{ title: "Rules", link: "/post/1" }]);
      expect(event.related<BookshelfModel>("details").get("category_titles")).to.deep.equal(["Overall"]);
    });

    it("should keep the default divisions when the template has none", async () => {
      const template = await createTestTemplate();

      const event = eventService.createEvent(template);

      expect(Object.keys(event.get("divisions"))).to.deep.equal(["solo", "team", "unranked"]);
    });

    // GAP: the preset state is only applied by client-side JS on the settings form,
    // so an event created server-side from a template keeps the "pending" defaults
    it.fails("should apply the state of the template preset", async () => {
      const preset = await createTestPreset();
      const template = await createTestTemplate({ event_preset_id: preset.get("id") });

      const event = eventService.createEvent(template);

      expect(event.get("status")).to.equal(enums.EVENT.STATUS.OPEN);
      expect(event.get("status_entry")).to.equal(enums.EVENT.STATUS_ENTRY.OPEN);
    });

  });

});
