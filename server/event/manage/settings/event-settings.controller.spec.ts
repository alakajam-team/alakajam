/* eslint-disable @typescript-eslint/no-unused-expressions */

import { afterEach, beforeEach, describe, it } from "vitest";
import { expect } from "chai";
import { stub, SinonStub } from "sinon";
import fileStorage from "server/core/file-storage";
import security from "server/core/security";
import eventService from "server/event/event.service";
import ratingService from "server/event/ratings/rating.service";
import tournamentService from "server/event/tournament/tournament.service";
import { mockRequest, mockResponse } from "server/testing/mocks";
import themeShortlistService from "../../theme/theme-shortlist.service";
import { eventManage } from "./event-settings.controller";

describe("Event settings controller", () => {

  const stubs: SinonStub[] = [];
  let createdEvent: any;

  beforeEach(() => {
    createdEvent = {
      id: 1,
      get: () => undefined,
      previous: () => undefined,
      set() { return this; },
      hasChanged: () => false,
      related: () => ({ set: () => undefined, get: () => undefined, save: () => Promise.resolve(undefined) }),
      save: () => Promise.resolve(createdEvent),
    };
    stubs.push(
      stub(security, "isAdmin").returns(true),
      stub(security, "canUserManage").returns(true),
      stub(eventService, "createEvent").returns(createdEvent),
      stub(fileStorage, "savePictureToModel").resolves({} as any),
      stub(eventService, "findEvents").resolves({ models: [] } as any),
      stub(themeShortlistService, "computeShortlist").resolves(),
      stub(ratingService, "computeRankings").resolves(),
      stub(ratingService, "clearRankings").resolves(),
      stub(tournamentService, "recalculateAllTournamentScores").resolves(),
    );
  });

  afterEach(() => {
    stubs.splice(0).forEach(s => s.restore());
  });

  it("should upload the logo onto the new event when creating one (#644)", async () => {
    const req = mockRequest({
      body: {
        "name": "test-event", "title": "Test", "status": "pending", "status-theme": "disabled",
        "status-entry": "off", "status-results": "disabled", "status-tournament": "disabled",
        "divisions": "{}", "category-titles": "[]",
      },
      files: { logo: [{ path: "/tmp/logo.png" }] } as any,
    });
    const res = mockResponse<any>();
    res.locals.user = { id: 1 };
    res.redirect = (() => undefined) as any;
    res.errorPage = (() => undefined) as any;

    await eventManage(req, res).catch(() => undefined); // Anything after the upload isn't under test

    const savePicture = fileStorage.savePictureToModel as unknown as SinonStub;
    expect(savePicture.calledOnce).to.be.true;
    expect(savePicture.firstCall.args[0]).to.equal(createdEvent);
  });
});
