/**
 * ldjam.com entry importer
 *
 * @module services/entry-importers/ldjam
 */

import * as download from "download";
import * as leftPad from "left-pad";
import cache from "server/core/cache";
import enums from "server/core/enums";
import forms from "server/core/forms";
import log from "server/core/log";
import { EntryDetails, EntryImporter, EntryImporterError, EntryReference } from "../entry-import.d";
import * as entryImporterTools from "../entry-importer-tools";

const ldJamEntryImporter: EntryImporter = {
  config: {
    id: "ldjam.com",
    title: "Ludum Dare (ldjam.com)",
    mode: "scraping",
  },
  fetchEntryReferences,
  fetchEntryDetails,
};

async function fetchEntryReferences(profileIdentifier: string): Promise<EntryReference[] | EntryImporterError> {
  let profileName;
  if (profileIdentifier.includes("://")) {
    profileName = profileIdentifier.replace(/\/$/, "").replace(/^.*\//, "");
  } else {
    profileName = profileIdentifier;
  }

  // Fetch user ID
  let profileId = null;
  try {
    const rawPage = await download(`https://api.ldjam.com/vx/node/walk/1/users/${profileName}`);
    const userIdInfo = JSON.parse(rawPage);
    if (userIdInfo.path && userIdInfo.path.length === 2) {
      profileId = userIdInfo.path[1];
    }
  } catch (e) {
    log.warn("Failed to download user info", e);
    return { error: "Failed to download user info" };
  }
  if (profileId === null) {
    return { error: "Unknown user name" };
  }

  // Fetch user entry IDs
  // XXX No support for >25 games
  const userEntriesUrl = `https://api.ldjam.com/vx/node/feed/${profileId}/authors/item/game?limit=25`;
  let entriesIds = null;
  try {
    const rawPage = await download(userEntriesUrl);
    const entriesInfo = JSON.parse(rawPage);
    if (entriesInfo.feed) {
      entriesIds = entriesInfo.feed.map((node) => node.id);
    }
  } catch (e) {
    log.warn("Failed to download user game IDs", e);
    return { error: "Failed to download user game IDs" };
  }
  if (entriesIds === null) {
    return { error: "No game IDs data found" };
  }

  // Fetch entry info
  const entryNodesUrl = "https://api.ldjam.com/vx/node/get/" + entriesIds.join("+");
  let entriesData = null;
  try {
    const rawPage = await download(entryNodesUrl);
    const data = JSON.parse(rawPage);
    if (data.node) {
      entriesData = data.node;
    }
  } catch (e) {
    log.warn("Failed to download user games", e);
    return { error: "Failed to download user games" };
  }
  if (entriesData === null) {
    return { error: "No game data found" };
  }

  // Build entry references
  const entryReferences = [];
  for (const game of entriesData) {
    // Path format: "/events/ludum-dare/[number]/game-name"
    const pathTokens = game.path.split("/");
    const eventName = entryImporterTools.capitalizeAllWords(pathTokens[2].replace(/-/g, " ")) + " " + pathTokens[3];
    const thumbnailPicture = _replaceTripleSlashes(game.meta.cover);

    entryReferences.push({
      id: "ldjam-" + profileName + "-" + game.id,
      title: forms.sanitizeString(game.name),
      link: "https://ldjam.com" + game.path,
      thumbnail: forms.isURL(thumbnailPicture) ? thumbnailPicture : null,
      importerProperties: {
        externalEvent: forms.sanitizeString(eventName),
        published: game.published,
        meta: game.meta,
        body: forms.sanitizeMarkdown(game.body),
      },
    });
  }

  return entryReferences;
}

async function fetchEntryDetails(entryReference: EntryReference): Promise<EntryDetails | EntryImporterError> {
  // Transform links data
  const meta = entryReference.importerProperties.meta;
  const tagNames = await _fetchLDJamTagNames();
  const links = [];
  for (let linkNumber = 1; linkNumber < 20; linkNumber++) {
    const linkKey = "link-" + leftPad(linkNumber, 2, "0");
    if (meta[linkKey]) {
      const label = meta[linkKey + "-name"] || tagNames[meta[linkKey + "-tag"]];
      if (label) {
        links.push({
          url: meta[linkKey],
          label,
        });
      }
    }
  }

  // Guess platforms
  const linksText = links.map((link) => link.label).join(" ");
  const platforms = entryImporterTools.guessPlatforms(linksText);

  // Build entry details
  links.push({
    label: "Ludum Dare entry page",
    url: entryReference.link,
  });
  const regex = new RegExp("!\[[^\\]]*\]\\(" + meta.cover + "\\)");
  const body = entryReference.importerProperties.body ?
    entryReference.importerProperties.body.replace(regex, "").trim() : "";

  const entryDetails = {
    title: entryReference.title,
    externalEvent: entryReference.importerProperties.externalEvent,
    published: entryReference.importerProperties.published,
    picture: entryReference.thumbnail,
    body: _replaceTripleSlashes(body),
    division: meta.author.length > 1 ? enums.DIVISION.TEAM : enums.DIVISION.SOLO,
    platforms,
    links,
  };

  return entryDetails as EntryDetails;
}

function _replaceTripleSlashes(str) {
  return str ? str.replace(/\/\/\//g, "https://static.jam.vg/") : str;
}

async function _fetchLDJamTagNames() {
  return cache.getOrFetch(cache.entryImport, "ldjamtagnames", async () => {
    try {
      const rawPage = await download("https://api.ldjam.com/vx/tag/get/platform");
      const tags = JSON.parse(rawPage).tag;
      const platforms = {};
      tags.forEach((tag) => {
        platforms[tag.id] = tag.name;
      });
      return platforms;
    } catch (e) {
      return { error: "Failed to download platforms data" };
    }
  });
}

export default ldJamEntryImporter;
