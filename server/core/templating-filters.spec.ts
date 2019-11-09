import { expect } from "chai";
import * as templatingFilters from "./templating-filters";

const ALAKAJAM_LAUNCH_DATE = new Date("2017-06-22T19:00:00Z");

describe("Templating filters", () => {

  const filters: Record<string, (...args: any[]) => any> = {};

  before(() => {
    const mockNunjucks = { addFilter: (name, filter) => filters[name] = filter };
    templatingFilters.configure(mockNunjucks);
  });

  it.only("should support formatting dates", () => {
    expect(filters.date(ALAKAJAM_LAUNCH_DATE)).to.equal("June 22nd 2017");
  });

  it.only("should support formatting dates with time", () => {
    expect(filters.dateTime(ALAKAJAM_LAUNCH_DATE)).to.equal("June 22nd 2017, 7:00pm");
  });

  it.only("should support formatting featured event dates", () => {
    expect(filters.featuredEventDateTime(ALAKAJAM_LAUNCH_DATE)).to.equal("Jun. 22nd, 7pm UTC");
  });

  it.only("should support formatting relative times", () => {
    expect(filters.relativeTime(ALAKAJAM_LAUNCH_DATE)).to.match(/years ago$/g);
  });

});
