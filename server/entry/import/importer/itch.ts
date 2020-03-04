/**
 * itch.io entry importer
 *
 * @module services/entry-importers/itch
 */

import * as cheerio from "cheerio";
import * as download from "download";
import forms from "server/core/forms";
import log from "server/core/log";
import { EntryDetails, EntryImporter, EntryImporterError, EntryReference } from "../entry-import.d";

const itchEntryImporter: EntryImporter = {
  config: {
    id: "itch.io",
    title: "Itch.io",
    mode: "oauth",
    oauthUrl: "https://itch.io/user/oauth?client_id=5cdadb611825c8421a9b4872d392e227"
      + "&scope=profile%3Agames&response_type=token&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob",
  },
  fetchEntryReferences,
  fetchEntryDetails,
};

async function fetchEntryReferences(profileIdentifier: string): Promise<EntryReference[] | EntryImporterError> {
  const myGamesApiUrl = `https://itch.io/api/1/${profileIdentifier}/my-games`;

  let data;
  try {
    data = JSON.parse(await download(myGamesApiUrl));
  } catch (e) {
    log.warn("Failed to download " + myGamesApiUrl, e);
    return { error: "Failed to call itch.io API" };
  }

  if (data.errors) {
    return { error: data.errors.join(", ") };
  }

  const entryReferences: EntryReference[] = [];
  if (Array.isArray(data.games)) {
    for (const entry of data.games) {
      entryReferences.push({
        id: entry.id.toString(),
        title: entry.title,
        link: entry.url,
        thumbnail: entry.cover_url,
        importerProperties: {
          published: entry.published_at,
          links: [{
            url: entry.url,
            label: "Play the game",
          }],
          description: entry.short_text,
        },
      });
    }
  }
  return entryReferences;
}

async function fetchEntryDetails(entryReference: EntryReference): Promise<EntryDetails | EntryImporterError> {
  const entryDetails = Object.assign({}, entryReference, entryReference.importerProperties);

  // Fetch additional info from actual game page
  let rawPage;
  try {
    rawPage = await download(entryReference.link);
  } catch (e) {
    log.warn("Failed to download " + entryReference.link, e);
    return { error: "Failed to download " + entryReference.link };
  }
  const $ = cheerio.load(rawPage.toString());

  // Event title
  const $jamEntryLinks = $("li.jam_entry");
  if ($jamEntryLinks.length > 0) {
    entryDetails.externalEvent = $($jamEntryLinks.get(0)).text().replace("View submission for ", "");
  }

  // Detailed description
  const detailedDescriptionHtml = $(".formatted_description").html();
  entryDetails.body = forms.htmlToMarkdown(detailedDescriptionHtml);

  // Large picture
  entryDetails.picture = $(".screenshot_list a").attr("href") || entryDetails.thumbnail;

  // Platforms (the API also has information but it's incomplete as HTML5 is missing)
  const platforms = [];
  $(".game_info_panel_widget tr").each((_: number, elem) => {
    const $rowCells = $(elem).find("td");
    if ($rowCells.length > 0 && $($rowCells.get(0)).text() === "Platforms") {
      $(elem).find("a").each((__: number, elem2) => {
        const platformId = $(elem2).attr("href").replace(/.*\/platform-/g, "");
        switch (platformId) {
          case "windows":
            platforms.push("Windows");
            break;
          case "osx":
            platforms.push("Mac");
            break;
          case "linux":
            platforms.push("Linux");
            break;
          case "ios":
          case "android":
            platforms.push("Mobile");
            break;
          case "html5":
            platforms.push("Web");
            break;
        }
      });
    }
  });
  entryDetails.platforms = platforms;

  return entryDetails as EntryDetails;
}

export default itchEntryImporter;