import { expect } from "chai";
import * as templatingFilters from "./templating-filters";

const ALAKAJAM_LAUNCH_DATE = "2017-06-22T19:00:00Z";

describe("Templating filters", () => {

  const mockUser = { get: () => "utc" } as any;

  describe("date formatting", () => {

    it("should support formatting dates", () => {
      expect(templatingFilters.date(ALAKAJAM_LAUNCH_DATE, mockUser)).to.equal("June 22nd 2017");
    });

    it("should support formatting dates with time", () => {
      expect(templatingFilters.dateTime(ALAKAJAM_LAUNCH_DATE, mockUser)).to.equal("June 22nd 2017, 7:00pm");
    });

    it("should support formatting featured event dates", () => {
      expect(templatingFilters.featuredEventDateTime(ALAKAJAM_LAUNCH_DATE, mockUser)).to.equal("June 22nd, 7:00pm");
    });

    it("should support formatting relative times", () => {
      expect(templatingFilters.relativeTime(ALAKAJAM_LAUNCH_DATE)).to.match(/years ago$/g);
    });

    it("should make the timezone explicit if user timezone is unknown", () => {
      expect(templatingFilters.dateTime(ALAKAJAM_LAUNCH_DATE)).to.equal("June 22nd 2017, 7:00pm UTC");
    });

    it("should not make the timezone explicit if hours are not displayed", () => {
      expect(templatingFilters.date(ALAKAJAM_LAUNCH_DATE)).to.equal("June 22nd 2017");
    });

  });

});
