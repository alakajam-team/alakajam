/**
 * Service for importing entries from third-party websites
 */

import { BookshelfModel, EntryBookshelfModel } from "bookshelf";
import download from "download";
import * as fs from "fs-extra";
import * as path from "path";
import cache from "server/core/cache";
import * as configUtils from "server/core/config";
import enums from "server/core/enums";
import log from "server/core/log";
import { User } from "server/entity/user.entity";
import eventService from "server/event/event.service";
import * as url from "url";
import { EntryImporter, EntryImporterError, EntryReference } from "./entry-import";
import entryImporterItch from "./importer/itch";
import entryImporterLDJam from "./importer/ldjam";
import entryImporterLudumDare from "./importer/ludumdare";

const importers: EntryImporter[] = [
  entryImporterItch,
  entryImporterLudumDare,
  entryImporterLDJam
];

export class EntryUmportService {

  public getAvailableImporters(): EntryImporter[] {
    return importers;
  }

  public async fetchEntryReferences(user: User, importerId: string, profileIdentifier: string):
  Promise<EntryReference[] | EntryImporterError> {
    // Fetch and cache entry list
    const cacheKey = importerId + "-" + profileIdentifier;
    const entryReferences = await cache.getOrFetch<EntryReference[] | EntryImporterError>(cache.entryImport, cacheKey, async () => {
      try {
        const importer = this.getImporter(importerId);
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

    if (!("error" in entryReferences)) {
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

  public async createOrUpdateEntry(user: User, importerId: string, profileIdentifier: string, entryId: string):
  Promise<BookshelfModel | EntryImporterError> {
    try {
      // Find entry reference (hopefully cached)
      const entryReferences = await this.fetchEntryReferences(user, importerId, profileIdentifier);
      if ("error" in entryReferences) {
        return { error: "Failed to fetch entry list before downloading entry" };
      }
      const entryReference = entryReferences.find((e) => e.id === entryId);
      if (!entryReference) {
        log.error(`Entry not found: ${profileIdentifier} ${entryId}`);
        return { error: "Entry not found for this profile" };
      }

      // Fetch details
      const importer = this.getImporter(importerId);
      if (!importer) {
        return { error: "No importer found with name " + importerId };
      }
      const entryDetails = await importer.fetchEntryDetails(entryReference);
      if ("error" in entryDetails) {
        return { error: entryDetails.error };
      }

      // Create entry or force refreshing existing one (due to fetchEntryReferences() caching)
      let entryModel: EntryBookshelfModel;
      if (!entryReference.existingEntry) {
        entryModel = await eventService.createEntry(user);
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
      const entryDetailsModel = entryModel.related<BookshelfModel>("details");
      entryDetailsModel.set("body", entryDetails.body);

      if (entryDetails.picture) {
        // Choose temporary path
        let temporaryPath: string | boolean = false;
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
            await fs.writeFile(temporaryPath, pictureData);
            await fs.access(temporaryPath, fs.constants.R_OK);
            downloadSuccessful = true;
          } catch (e) {
            log.warn("Failed to download entry picture " + entryDetails.picture + " to " + temporaryPath, e);
          }

          // Create actual entry picture
          if (downloadSuccessful) {
            const result = await eventService.setEntryPicture(entryModel, temporaryPath);
            if ("error" in result) {
              log.warn("Failed to save picture upload " + temporaryPath);
              log.warn(result.error);
            }

            // Delete temporary picture if needed
            fs.unlink(temporaryPath)
              .catch(e => log.error(e));
          }
        }
      }

      // Save entry
      await Promise.all([entryModel.save(), entryDetailsModel.save()]);

      return entryModel;
    } catch (e) {
      const error = "Failed to fetch entry details";
      log.error(error, e);
      return { error };
    }
  }

  private getImporter(id): EntryImporter | undefined {
    return importers.find((importer) => importer.config.id === id);
  }

}

export default new EntryUmportService();
