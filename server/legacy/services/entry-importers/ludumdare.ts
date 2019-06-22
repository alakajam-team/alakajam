/**
 * ludumdare.com entry importer
 *
 * @module services/entry-importers/ludumdare
 */

import * as cheerio from "cheerio";
import * as download from "download";
import forms from "../../../core/forms";
import log from "../../../core/log";
import entryImporterTools from "./entry-importer-tools";

export default {
  config: {
    id: "ludumdare.com",
    title: "Ludum Dare legacy site (ludumdare.com)",
    mode: "scraping",
  },
  fetchEntryReferences,
  fetchEntryDetails,
};

async function fetchEntryReferences(profileIdentifier) {
  let profileName;
  if (profileIdentifier.includes("://")) {
    profileName = profileIdentifier.replace(/\/$/, "").replace(/^.*\//, "");
  } else {
    profileName = profileIdentifier;
  }

  // Download page
  const downloadUrl = `http://ludumdare.com/compo/author/${profileName}/`;
  let rawPage;
  try {
    rawPage = await download(downloadUrl);
  } catch (e) {
    log.warn("Failed to download " + downloadUrl, e);
    return [];
  }
  const $ = cheerio.load(rawPage.toString());

  const entryReferences = [];
  $("#compo2 td a").each((_: number, elem) => {
    // Fetch info
    const thumbnail = $("img", elem).attr("src");
    const title = $(elem).text();
    const link = $(elem).attr("href").replace("../../", "http://ludumdare.com/compo/");
    const eventId = $(elem).attr("href").replace("../../", "").replace(/\/.*/, "");
    const externalEvent = entryImporterTools.capitalizeAllWords(eventId.replace(/-/g, " ")).replace("Minild", "MiniLD");

    // Sanitize & store info
    entryReferences.push({
      id: "ludumdare-" + profileName + "-" + forms.sanitizeString(eventId),
      title: forms.sanitizeString(title),
      link: forms.isURL(link) ? link : null,
      thumbnail: forms.isURL(thumbnail) ? thumbnail : null,
      importerProperties: {
        externalEvent: forms.sanitizeString(externalEvent),
      },
    });
  });

  return entryReferences;
}

async function fetchEntryDetails(entryReference) {
  const rawPage = await download(entryReference.link);
  const $ = cheerio.load(rawPage.toString());

  // Grab author info to make sure we're on a working entry page
  const authorLink = $("#compo2 a strong");
  if (authorLink.text()) {
    // Fetch detailed info
    const picture = $("#shotview img").attr("src");
    const body = $($("#compo2 h2").get(1)).prev().text();
    let linksText = "";
    let links = $("#compo2 .links a").map((i, link) => {
      const $link = $(link);
      linksText += $link.text().toLowerCase() + " ";
      return {
        label: $link.text(),
        url: $link.attr("href"),
      };
    }).get();

    // Prepare links (with an additional to ludumdare.com)
    links = links.map((link) => ({
      label: forms.sanitizeString(link.label),
      url: forms.isURL(link.url) ? link.url : null,
    }));
    links.push({
      label: "Ludum Dare entry page",
      url: entryReference.link,
    });

    // Sanitize & store
    const entryDetails = {
      title: entryReference.title,
      externalEvent: entryReference.importerProperties.externalEvent,
      published: eventDate(entryReference.importerProperties.externalEvent),
      picture: forms.isURL(picture) ? picture : null,
      body: forms.sanitizeString(body, { maxLength: 100000 }),
      platforms: entryImporterTools.guessPlatforms(linksText),
      links,
    };

    return entryDetails;
  }

  return { error: "Entry page seems empty" };
}

function eventDate(eventName) {
  const eventDates = {
    // LD dates are stored for teams
    "Ludum Dare 18": "2010-08-23",
    "Ludum Dare 19": "2010-12-20",
    "Ludum Dare 20": "2011-05-02",
    "Ludum Dare 21": "2011-08-22",
    "Ludum Dare 22": "2011-12-19",
    "Ludum Dare 23": "2012-04-23",
    "Ludum Dare 24": "2012-08-27",
    "Ludum Dare 25": "2012-12-17",
    "Ludum Dare 26": "2013-04-29",
    "Ludum Dare 27": "2013-08-26",
    "Ludum Dare 28": "2013-12-16",
    "Ludum Dare 29": "2014-04-28",
    "Ludum Dare 30": "2014-08-25",
    "Ludum Dare 31": "2014-12-08",
    "Ludum Dare 32": "2015-04-20",
    "Ludum Dare 33": "2015-08-24",
    "Ludum Dare 34": "2015-12-14",
    "Ludum Dare 35": "2016-04-18",
    "Ludum Dare 36": "2016-08-29",

    "MiniLD 40": "2013-02-29",
    "MiniLD 41": "2013-03-31",
    "MiniLD 42": "2013-05-31",
    "MiniLD 43": "2013-06-30",
    "MiniLD 44": "2013-07-31",
    "MiniLD 45": "2013-09-30",
    "MiniLD 46": "2013-11-30",
    "MiniLD 47": "2013-12-01",
    "MiniLD 48": "2014-01-31",
    "MiniLD 49": "2014-02-28",
    "MiniLD 50": "2014-03-31",
    "MiniLD 51": "2014-05-31",
    "MiniLD 52": "2014-06-30",
    "MiniLD 53": "2014-07-31",
    "MiniLD 54": "2014-09-30",
    "MiniLD 55": "2014-11-30",
    "MiniLD 56": "2015-01-31",
    "MiniLD 57": "2015-02-28",
    "MiniLD 58": "2015-03-31",
    "MiniLD 59": "2015-05-31",
    "MiniLD 60": "2015-06-30",
    "MiniLD 61": "2015-07-31",
    "MiniLD 62": "2015-09-30",
    "MiniLD 63": "2015-11-30",
    "MiniLD 64": "2016-01-31",
    "MiniLD 65": "2016-02-29",
    "MiniLD 66": "2016-03-31",
    "MiniLD 67": "2016-05-31",
    "MiniLD 68": "2016-06-30",
    "MiniLD 69": "2016-07-31",
    "MiniLD 70": "2016-09-30",
    "MiniLD 71": "2017-01-31",
    "MiniLD 72": "2017-02-28",
    "MiniLD 73": "2017-03-31",
    "MiniLD 74": "2017-07-31",
  };

  return eventDates[eventName] ? new Date(eventDates[eventName]) : null;
}
