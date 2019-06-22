/**
 * Service for importing entries from third-party websites
 *
 * @module services/event-import-service
 */

import * as download from "download";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import { promisify } from "util";
import cache from "../../core/cache";
import * as configUtils from "../../core/config";
import enums from "../../core/enums";
import log from "../../core/log";
import entryImporterItch from "./entry-importers/itch";
import entryImporterLDJam from "./entry-importers/ldjam";
import entryImporterLudumDare from "./entry-importers/ludumdare";
import eventService from "./event-service";

/**
 * Importers spec:
 *
 * > config
 *
 * Constants to configure the importer.
 *   - id = some unique string
 *   - title = full importer name as listed on the client-side
 *   - mode = 'scraping' or 'oauth'
 *   - oauthUrl = URL to send the user to, in case 'oauth' mode has been selected
 *
 * > fetchEntryReferences(profileIdentifier)
 *
 * 'identifier' is either an OAuth authorization key (if mode is 'oauth'), or a profile name/URL otherwise.
 * The function must return an array of entry references. Each entry reference holds:
 *   - id = Unique entry ID (use the importer name + profile name
 *        + remote entry ID to generate this). Must be usable as a filename.
 *   - title = Entry title
 *   - link = Optional link to the remote entry
 *   - thumbnail = Optional remote thumbnail picture of the entry
 *   - importerProperties = Any additional info required by the importer for downloading the entry details
 *
 * > fetchEntryDetails(entryReference)
 *
 * The function grabs the detailed info of an entry. The object holds:
 *   - title = Entry title
 *   - externalEvent = Event title
 *   - published = Optional entry publication date
 *   - picture = Optional URL of a picture to download
 *   - links = An array of links to play the game [{url, label}]
 *   - platforms = Optional array of entry platforms
 *   - description = Optional short description (plain text)
 *   - body = Detailed description (plain text or Markdown, no HTML)
 *   - division = Optional game division (solo/team)
 */
const importers = [
  entryImporterItch,
  entryImporterLudumDare,
  entryImporterLDJam
];

export default {
  getAvailableImporters,
  fetchEntryReferences,
  createOrUpdateEntry,
};

function getAvailableImporters() {
  return importers;
}

async function fetchEntryReferences(user, importerId, profileIdentifier) {
  // Fetch and cache entry list
  const cacheKey = importerId + "-" + profileIdentifier;
  const entryReferences = await cache.getOrFetch<any>(cache.entryImport, cacheKey, async () => {
    try {
      const importer = _getImporter(importerId);
      if (importer) {
        return await importer.fetchEntryReferences(profileIdentifier);
      } else {
        return { error: "No importer found with name " + importerId };
      }
    } catch (e) {
      const error = "Failed to fetch entry list";
      log.error(error, e);
      return { error };
    }
  });

  if (!entryReferences.error) {
    // Enhance result by detecting existing entries
    const entries = await eventService.findUserEntries(user);
    for (const entryReference of entryReferences) {
      entryReference.existingEntry = entries.find((entry) => {
        return entry.get("event_name") === null && entry.get("title") === entryReference.title;
      });
    }
  } else {
    // Don't cache failures
    cache.entryImport.del(cacheKey);
  }

  return entryReferences;
}

async function createOrUpdateEntry(user, importerId, profileIdentifier, entryId) {
  try {
    // Find entry reference (hopefully cached)
    const entryReferences = await fetchEntryReferences(user, importerId, profileIdentifier);
    if (entryReferences.error) {
      return { error: "Failed to fetch entry list before downloading entry" };
    }
    const entryReference = entryReferences.find((e) => e.id === entryId);
    if (!entryReference) {
      log.error(`Entry not found: ${profileIdentifier} ${entryId}`);
      return { error: "Entry not found for this profile" };
    }

    // Fetch details
    const importer = _getImporter(importerId);
    if (!importer) {
      return { error: "No importer found with name " + importerId };
    }
    const entryDetails = await importer.fetchEntryDetails(entryReference);
    if (entryDetails.error) {
      return { error: entryDetails.error };
    }

    // Create entry or force refreshing existing one (due to fetchEntryReferences() caching)
    let entryModel;
    if (!entryReference.existingEntry) {
      entryModel = await eventService.createEntry(user, null);
    } else {
      entryModel = await eventService.findEntryById(entryReference.existingEntry.get("id"));
    }

    // Set model info
    entryModel.set({
      title: entryDetails.title,
      external_event: entryDetails.externalEvent,
      description: entryDetails.description || null,
      division: entryDetails.division || enums.DIVISION.SOLO,
      platforms: entryDetails.platforms || [],
      published_at: entryDetails.published || null,
      links: entryDetails.links.map((link) => ({ // ensure data format, just in case
        label: link.label,
        url: link.url,
      })),
    });
    const entryDetailsModel = entryModel.related("details");
    entryDetailsModel.set("body", entryDetails.body);

    if (entryDetails.picture) {
      // Choose temporary path
      let temporaryPath: string|boolean = false;
      try {
        const extension = path.extname(url.parse(entryDetails.picture).pathname) || "";
        temporaryPath = path.join(configUtils.dataPathAbsolute(), "tmp", entryReference.id + extension);
      } catch (e) {
        log.warn("Failed to detect picture file name of " + entryDetails.picture, e);
      }

      // Download picture in temporary path
      if (temporaryPath) {
        let downloadSuccessful = false;
        try {
          const pictureData = await download(entryDetails.picture);
          await promisify(fs.writeFile)(temporaryPath, pictureData);
          await promisify(fs.access)(temporaryPath, fs.constants.R_OK);
          downloadSuccessful = true;
        } catch (e) {
          log.warn("Failed to download entry picture " + entryDetails.picture + " to " + temporaryPath, e);
        }

        // Create actual entry picture
        if (downloadSuccessful) {
          const result = await eventService.setEntryPicture(entryModel, temporaryPath);
          if (result.error) {
            log.warn("Failed to save picture upload " + temporaryPath);
            log.warn(result.error);
          }

          // Delete temporary picture if needed
          promisify(fs.unlink)(temporaryPath);
        }
      }
    }

    // Save entry
    await Promise.all([ entryModel.save(), entryDetailsModel.save() ]);

    return entryModel;
  } catch (e) {
    const error = "Failed to fetch entry details";
    log.error(error, e);
    return { error };
  }
}

function _getImporter(id) {
  const found = importers.find((importer) => importer.config.id === id);
  return found || null;
}
