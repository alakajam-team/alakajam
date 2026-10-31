/* eslint-disable @typescript-eslint/no-unused-expressions */

import { describe, it } from "vitest";
import { expect } from "chai";
import { BookshelfModel } from "bookshelf";
import * as luxon from "luxon";
import constants from "./constants";
import forms from "./forms";
import { createLuxonDate, formatDate, ordinal, ZONE_UTC } from "./formats";

const WINTER_DATE = "2024-03-02T15:30:00Z";
const SUMMER_NIGHT_DATE = "2024-07-01T22:30:00Z"; // Already the next day in Paris (UTC+2)

function userWithTimezone(timezone?: string): BookshelfModel {
  return { get: (key: string) => (key === "timezone" ? timezone : undefined) } as unknown as BookshelfModel;
}

describe("Date formats", () => {

  describe("luxon global settings", () => {
    it("should default to the English locale and UTC", () => {
      expect(luxon.Settings.defaultLocale).to.equal("en");
      expect(luxon.DateTime.local().zoneName.toLowerCase()).to.equal(ZONE_UTC);
    });
  });

  describe("createLuxonDate", () => {
    it("should create a UTC date from an ISO string", () => {
      const date = createLuxonDate(WINTER_DATE);
      expect(date.isValid).to.be.true;
      expect(date.zoneName.toLowerCase()).to.equal(ZONE_UTC);
      expect(date.toISO()).to.equal("2024-03-02T15:30:00.000Z");
    });

    it("should create dates from timestamps and JS dates", () => {
      const millis = Date.parse(WINTER_DATE);
      expect(createLuxonDate(millis).toMillis()).to.equal(millis);
      expect(createLuxonDate(new Date(millis)).toMillis()).to.equal(millis);
    });

    it("should create the current date when called without a date", () => {
      const now = createLuxonDate();
      expect(now.isValid).to.be.true;
      expect(Math.abs(now.toMillis() - Date.now())).to.be.lessThan(5000);
    });

    it("should parse a string with a custom format", () => {
      const date = createLuxonDate("2024-03-02 15:30", {}, constants.PICKER_DATE_TIME_FORMAT);
      expect(date.toISO()).to.equal("2024-03-02T15:30:00.000Z");
    });

    it("should honor the zone option", () => {
      const date = createLuxonDate("2024-03-02 15:30", { zone: "Europe/Paris" }, constants.PICKER_DATE_TIME_FORMAT);
      expect(date.toUTC().toISO()).to.equal("2024-03-02T14:30:00.000Z");
    });

    it("should flag invalid input", () => {
      expect(createLuxonDate("not a date").isValid).to.be.false;
      expect(createLuxonDate("2024-13-45", {}, constants.PICKER_DATE_FORMAT).isValid).to.be.false;
    });
  });

  describe("formatDate", () => {
    it("should return an empty string without a date", () => {
      expect(formatDate(undefined, undefined, constants.DATE_FORMAT)).to.equal("");
    });

    it("should format dates in UTC by default, with ordinal days", () => {
      expect(formatDate(WINTER_DATE, undefined, constants.DATE_FORMAT)).to.equal("March 2nd 2024");
      expect(formatDate("2024-03-01T00:00:00Z", undefined, constants.DATE_FORMAT)).to.equal("March 1st 2024");
      expect(formatDate("2024-03-03T00:00:00Z", undefined, constants.DATE_FORMAT)).to.equal("March 3rd 2024");
      expect(formatDate("2024-03-11T00:00:00Z", undefined, constants.DATE_FORMAT)).to.equal("March 11th 2024");
    });

    it("should append a UTC suffix on times, and lowercase am/pm", () => {
      expect(formatDate(WINTER_DATE, undefined, constants.DATE_TIME_FORMAT)).to.equal("March 2nd 2024, 3:30pm UTC");
      expect(formatDate("2024-03-02T09:05:00Z", undefined, constants.DATE_TIME_FORMAT)).to.equal("March 2nd 2024, 9:05am UTC");
    });

    it("should be able to skip the UTC suffix", () => {
      expect(formatDate(WINTER_DATE, undefined, constants.DATE_TIME_FORMAT, { utcSuffixByDefault: false }))
        .to.equal("March 2nd 2024, 3:30pm");
    });

    it("should accept timestamps and JS dates", () => {
      const millis = Date.parse(WINTER_DATE);
      expect(formatDate(millis, undefined, constants.DATE_FORMAT)).to.equal("March 2nd 2024");
      expect(formatDate(new Date(millis), undefined, constants.DATE_FORMAT)).to.equal("March 2nd 2024");
    });

    it("should convert to the user's timezone, without UTC suffix", () => {
      const paris = userWithTimezone("Europe/Paris");
      expect(formatDate(WINTER_DATE, paris, constants.DATE_TIME_FORMAT)).to.equal("March 2nd 2024, 4:30pm");
      expect(formatDate(WINTER_DATE, userWithTimezone("America/Sao_Paulo"), constants.DATE_TIME_FORMAT))
        .to.equal("March 2nd 2024, 12:30pm");
    });

    it("should handle daylight saving time and day rollover", () => {
      const paris = userWithTimezone("Europe/Paris");
      expect(formatDate(SUMMER_NIGHT_DATE, paris, constants.DATE_TIME_FORMAT)).to.equal("July 2nd 2024, 12:30am");
      expect(formatDate(SUMMER_NIGHT_DATE, undefined, constants.DATE_TIME_FORMAT)).to.equal("July 1st 2024, 10:30pm UTC");
    });

    it("should ignore users without a timezone", () => {
      expect(formatDate(WINTER_DATE, userWithTimezone(undefined), constants.DATE_TIME_FORMAT))
        .to.equal("March 2nd 2024, 3:30pm UTC");
    });

    it("should support the featured event format", () => {
      expect(formatDate(WINTER_DATE, undefined, constants.FEATURED_EVENT_DATE_FORMAT)).to.equal("March 2nd, 3:30pm UTC");
    });
  });

  describe("ordinal", () => {
    it("should suffix numbers", () => {
      expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 24, 31].map(ordinal))
        .to.deep.equal(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "24th", "31st"]);
    });
  });

  describe("picker date parsing (forms)", () => {
    it("should parse picker date times as UTC", () => {
      expect(forms.parsePickerDateTime("2024-03-02 15:30")?.toISOString()).to.equal("2024-03-02T15:30:00.000Z");
    });

    it("should parse picker dates as UTC midnight", () => {
      expect(forms.parsePickerDate("2024-03-02")?.toISOString()).to.equal("2024-03-02T00:00:00.000Z");
    });

    it("should parse in a given timezone", () => {
      expect(forms.parsePickerDateTime("2024-07-01 12:00", { zone: "Europe/Paris" })?.toISOString())
        .to.equal("2024-07-01T10:00:00.000Z");
    });

    it("should return undefined on invalid input", () => {
      expect(forms.parsePickerDateTime("garbage")).to.be.undefined;
      expect(forms.parsePickerDate("2024-02-31")).to.be.undefined;
      expect(forms.parsePickerDate("")).to.be.undefined;
    });
  });

  describe("relative time", () => {
    it("should describe past and future dates", () => {
      const inTwoDays = createLuxonDate(Date.now() + 2 * 24 * 3600 * 1000 + 60000).toRelative();
      const twoHoursAgo = createLuxonDate(Date.now() - 2 * 3600 * 1000 - 60000).toRelative();
      expect(inTwoDays).to.equal("in 2 days");
      expect(twoHoursAgo).to.equal("2 hours ago");
    });
  });

});
