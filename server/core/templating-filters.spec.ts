import { expect } from "chai";
import "module-alias/register";
import * as templatingFilters from "./templating-filters";

const ALAKAJAM_LAUNCH_DATE = "2017-06-22T19:00:00Z";

describe("Templating filters", () => {

  const filters: Record<string, (...args: any[]) => any> = {};
  const mockUser = { get: () => "utc" };

  before(() => {
    const mockNunjucks = { addFilter: (name, filter) => filters[name] = filter };
    templatingFilters.configure(mockNunjucks);
  });

  describe("date formatting", () => {

    it("should support formatting dates", () => {
      expect(filters.date(ALAKAJAM_LAUNCH_DATE, mockUser)).to.equal("June 22nd 2017");
    });

    it("should support formatting dates with time", () => {
      expect(filters.dateTime(ALAKAJAM_LAUNCH_DATE, mockUser)).to.equal("June 22nd 2017, 7:00pm");
    });

    it("should support formatting featured event dates", () => {
      expect(filters.featuredEventDateTime(ALAKAJAM_LAUNCH_DATE, mockUser)).to.equal("Jun. 22nd, 7pm");
    });

    it("should support formatting relative times", () => {
      expect(filters.relativeTime(ALAKAJAM_LAUNCH_DATE)).to.match(/years ago$/g);
    });

    it("should make the timezone explicit if user timezone is unknown", () => {
      expect(filters.dateTime(ALAKAJAM_LAUNCH_DATE)).to.equal("June 22nd 2017, 7:00pm UTC");
    });

    it("should not make the timezone explicit if hours are not displayed", () => {
      expect(filters.date(ALAKAJAM_LAUNCH_DATE)).to.equal("June 22nd 2017");
    });

  });

});
