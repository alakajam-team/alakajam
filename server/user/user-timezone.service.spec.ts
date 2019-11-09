// tslint:disable: no-unused-expression

import { expect } from "chai";
import { DateTime } from "luxon" ;
import userTimezoneService from "./user-timezone.service";

const PARIS_TIMEZONE = "Europe/Paris";

describe("User time zone service", () => {

  it("should return timezones with the matching country and offset names", async () => {
    const timezones = await userTimezoneService.getAllTimeZones();
    const parisTimezone = timezones.find((timezone) => timezone.id === PARIS_TIMEZONE);

    expect(parisTimezone).to.exist;
    expect(parisTimezone.countryName).to.equal("France");
    expect(parisTimezone.offsetName).to.equal(DateTime.utc().setZone(PARIS_TIMEZONE).offsetNameShort);
  });

});
