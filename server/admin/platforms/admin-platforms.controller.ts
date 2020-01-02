import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import cache from "server/core/cache";
import config from "server/core/config";
import forms from "server/core/forms";
import security from "server/core/security";
import { CustomRequest, CustomResponse } from "server/types";
import platformService from "../../entry/platform/platform.service";

/**
 * Admin only: Platforms management
 */
export async function adminPlatforms(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  if (!config.DEBUG_ADMIN && !security.isAdmin(res.locals.user)) {
    res.errorPage(403);
  }

  let errorMessage: string | null = null;

  // Save changed platform
  if (req.method === "POST") {
    const name = forms.sanitizeString(req.body.name);
    if (name) {
      let platform: BookshelfModel | null = null;

      if (forms.isId(req.body.id)) {
        platform = await platformService.fetchById(req.body.id);
        platform.set("name", name);
      } else {
        platform = platformService.createPlatform(forms.sanitizeString(req.body.name));
      }

      if (platform) {
        const duplicateCollection = await platformService.fetchMultipleNamed(platform.get("name"));
        let isDuplicate = false;
        duplicateCollection.forEach((potentialDuplicate) => {
          isDuplicate = isDuplicate || platform.get("id") !== potentialDuplicate.get("id");
        });
        if (!isDuplicate) {
          await platform.save();
          cache.general.del("platforms");
        } else {
          errorMessage = "Duplicate platform";
        }
      }
    }
  }

  if (forms.isId(req.query.delete)) {
    const platform = await platformService.fetchById(req.query.delete);
    if (platform) {
      const entryCount = await platformService.countEntriesByPlatform(platform);
      if (entryCount === 0) {
        await platform.destroy();
      }
    } else {
      errorMessage = "Platform to delete not found";
    }
  }

  // Fetch platform to edit
  let editPlatform: BookshelfModel;
  if (forms.isId(req.query.edit)) {
    editPlatform = await platformService.fetchById(req.query.edit);
  } else if (req.query.create) {
    editPlatform = platformService.createPlatform("");
  }

  // Count entries by platform
  const platformCollection = await platformService.fetchAll();
  const entryCountByPlatform: Record<number, number> = {};
  for (const platform of platformCollection.models) {
    entryCountByPlatform[platform.get("id")] = await platformService.countEntriesByPlatform(platform);
  }

  res.render("admin/platforms/admin-platforms", {
    platforms: platformCollection.models,
    entryCount: entryCountByPlatform,
    editPlatform,
    errorMessage,
  });
}
