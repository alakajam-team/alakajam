import { describe, it } from "vitest";
import { expect } from "chai";
import { mockRequest } from "server/testing/mocks";
import { parseQueryParameters } from "./event-manage-rankings.controller";

describe("Event manage rankings controller", () => {

  describe("parse query parameters", () => {

    function mockEvent(divisions: Record<string, unknown>) {
      return { get: (key: string) => key === "divisions" ? divisions : undefined } as any;
    }

    it("should return no division for an event without divisions (#658)", () => {
      const result = parseQueryParameters(mockRequest({ query: {} }), mockEvent({}));

      expect(result.currentDivisions).to.deep.equal([]);
    });

    it("should default to the first division", () => {
      const result = parseQueryParameters(mockRequest({ query: {} }), mockEvent({ solo: {}, team: {} }));

      expect(result.currentDivisions).to.deep.equal(["solo"]);
    });

    it("should support selecting all divisions", () => {
      const result = parseQueryParameters(mockRequest({ query: { division: "all" } }), mockEvent({ solo: {}, team: {} }));

      expect(result.currentDivisions).to.deep.equal(["solo", "team"]);
    });

  });
});
