import { BookshelfModel } from "bookshelf";
import forms from "server/core/forms";
import { EntryImporterError, EntryImporter, EntryReference } from "server/entry/import/entry-import";
import entryImportService from "server/entry/import/entry-import.service";
import { CustomRequest, CustomResponse } from "server/types";
import { DashboardLocals } from "./dashboard.middleware";

interface DashbaordEntryImportContext {
  availableImporters: EntryImporter[];

  importer?: string;
  profileIdentifier?: string;
  oauthIdentifier?: string;
  entryReferences?: EntryReference[];

  infoMessage?: string;
  errorMessage?: string;
}

export async function dashboardEntryImport(req: CustomRequest, res: CustomResponse<DashboardLocals>) {
  const context: DashbaordEntryImportContext = {
    availableImporters: entryImportService.getAvailableImporters(),
  };

  if (req.method === "POST") {
    context.importer = forms.sanitizeString(req.body.importer);
    context.profileIdentifier = forms.sanitizeString(req.body.profileIdentifier);
    context.oauthIdentifier = forms.sanitizeString(req.body.oauthIdentifier);

    let entryIds = req.body.entries;
    if (!Array.isArray(entryIds)) {
      entryIds = entryIds ? [entryIds] : [];
    }

    const importerProfileIdentifier = context.profileIdentifier || context.oauthIdentifier;
    if (req.body.run) {
      try {
        let result: BookshelfModel | EntryImporterError;
        for (const entryId of entryIds) {
          result = await entryImportService.createOrUpdateEntry(res.locals.user, context.importer,
            importerProfileIdentifier, entryId);
          if ("error" in result) {
            throw new Error(result.error);
          }
        }
        context.infoMessage = "Successfully imported " + entryIds.length + " "
          + (entryIds.length === 1 ? "entry" : "entries") + "!";
      } catch (e) {
        context.errorMessage = "Error happened during entry import: " + e.message
          + ". Import may have been partially done, please check your Entries page.";
      }
    } else if (entryIds.length > 0) {
      context.errorMessage = "You must confirm the games are yours before importing them (see checkbox at the bottom).";
    }

    if (importerProfileIdentifier) {
      const entryReferences = await entryImportService.fetchEntryReferences(
        res.locals.user, context.importer, importerProfileIdentifier);
      if ("error" in entryReferences) {
        context.errorMessage = entryReferences.error;
      } else {
        context.entryReferences = entryReferences;
      }
    }
  }

  res.render<DashboardLocals>("user/dashboard/dashboard-entry-import", {
    ...res.locals,
    ...context
  });
}
