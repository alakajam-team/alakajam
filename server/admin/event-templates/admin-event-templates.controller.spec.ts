/* eslint-disable @typescript-eslint/no-unused-expressions */

import { expect } from "chai";
import eventTemplateService from "server/event/manage/create/event-template.service";
import { mockRequest, mockResponse } from "server/testing/mocks";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import { createTestPreset, createTestTemplate } from "server/testing/testing-fixtures";
import { afterAll, beforeAll, describe, it } from "vitest";
import { AdminEventContext, adminEventTemplates } from "./admin-event-templates.controller";

describe("Admin event templates controller", { timeout: DB_TEST_TIMEOUT }, () => {
  beforeAll(async () => {
    await startTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it("should save a template", async () => {
    const preset = await createTestPreset();
    const title = uniqueTitle();

    await submit({ ...validForm(), title, "event-preset-id": preset.get("id").toString() });

    const template = await findTemplateByTitle(title);
    expect(template.get("event_title")).to.equal("Alakajam #42");
    expect(template.get("event_preset_id")).to.equal(preset.get("id"));
    expect(template.get("links")).to.deep.equal([{ title: "Rules", link: "/post/1" }]);
    expect(template.get("divisions")).to.deep.equal({ solo: "48 hours", unranked: "72 hours" });
    expect(template.get("category_titles")).to.deep.equal(["Overall", "Graphics"]);
  });

  it("should update an existing template", async () => {
    const template = await createTestTemplate();
    const title = uniqueTitle();

    await submit({ ...validForm(), id: template.get("id").toString(), title });

    const updated = await eventTemplateService.findEventTemplateById(template.get("id"));
    expect(updated.get("title")).to.equal(title);
  });

  it("should require a title", async () => {
    const res = await submit({ ...validForm(), title: "" });

    expect(renderContext(res).errorMessage).to.equal("Title is required");
  });

  it("should reject invalid JSON", async () => {
    const title = uniqueTitle();

    const res = await submit({ ...validForm(), title, divisions: "{ solo: " });

    expect(renderContext(res).errorMessage).to.equal("Invalid divisions JSON");
    expect(await findTemplateByTitle(title)).to.be.undefined;
  });

  it("should accept empty JSON fields", async () => {
    const title = uniqueTitle();

    await submit({ ...validForm(), title, links: "" });

    expect(await findTemplateByTitle(title)).not.to.be.undefined;
  });

  it("should reject too many rating categories", async () => {
    const title = uniqueTitle();

    await submit({ ...validForm(), title, "category-titles": JSON.stringify(["1", "2", "3", "4", "5", "6", "7", "8"]) });

    expect(await findTemplateByTitle(title)).to.be.undefined;
  });

  it("should reject an invalid preset ID", async () => {
    const title = uniqueTitle();

    const res = await submit({ ...validForm(), title, "event-preset-id": "999999" });

    expect(renderContext(res).errorMessage).to.equal("Invalid event preset");
    expect(await findTemplateByTitle(title)).to.be.undefined;
  });

  it("should delete a template", async () => {
    const template = await createTestTemplate();

    await submit({ id: template.get("id").toString(), delete: "" });

    expect(await findTemplateByTitle(template.get("title"))).to.be.undefined;
  });

});

let titleCounter = 0;

function uniqueTitle(): string {
  return `Admin template ${++titleCounter}`;
}

function validForm(): Record<string, string> {
  return {
    "title": uniqueTitle(),
    "event-title": "Alakajam #42",
    "event-preset-id": "",
    "links": JSON.stringify([{ title: "Rules", link: "/post/1" }]),
    "divisions": JSON.stringify({ solo: "48 hours", unranked: "72 hours" }),
    "category-titles": JSON.stringify(["Overall", "Graphics"])
  };
}

async function submit(body: Record<string, string>) {
  const res = mockResponse();
  await adminEventTemplates(mockRequest({ method: "POST", query: {}, body }), res);
  return res;
}

function renderContext(res: ReturnType<typeof mockResponse>): AdminEventContext & { errorMessage?: string } {
  return res.renderSpy.firstCall.args[1];
}

async function findTemplateByTitle(title: string) {
  const templates = await eventTemplateService.findEventTemplates();
  return templates.models.find((template) => template.get("title") === title);
}
