import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import forms from "server/core/forms";
import security from "server/core/security";
import { Platform } from "server/entity/platform.entity";
import platformRepository from "server/entry/platform/platform.repository";
import { CustomRequest, CustomResponse } from "server/types";
import platformService from "../../entry/platform/platform.service";
import { AdminBaseContext } from "../admin.base";

export interface AdminPlatformsContext extends AdminBaseContext {
  platforms: Platform[];
  entryCount: Record<number, number>;
  editPlatform?: Platform;
  errorMessage?: string;
}

/**
 * Admin only: Platforms management
 */
export async function adminPlatforms(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  if (!config.DEBUG_ADMIN && !security.isAdmin(res.locals.user)) {
    res.errorPage(403);
  }

  let errorMessage: string;

  // Save changed platform
  if (req.method === "POST") {
    const name = forms.sanitizeString(req.body.name);
    if (name) {
      let platform: Platform;

      if (forms.isId(req.body.id)) {
        platform = await platformRepository.findById(req.body.id);
        platform.set("name", name);
      } else {
        platform = platformRepository.createPlatform(forms.sanitizeString(req.body.name));
      }

      if (platform) {
        const duplicateCollection = await platformRepository.findAllByName([platform.name]);
        let isDuplicate = false;
        duplicateCollection.forEach((potentialDuplicate) => {
          isDuplicate = isDuplicate || platform.id !== potentialDuplicate.id;
        });
        if (!isDuplicate) {
          await platformService.save(platform);
        } else {
          errorMessage = "Duplicate platform";
        }
      }
    }
  }

  if (forms.isId(req.query.delete)) {
    const platform = await platformRepository.findById(forms.parseInt(req.query.delete));
    if (platform) {
      const entryCount = await platformRepository.countEntriesByPlatform(platform);
      if (entryCount === 0) {
        await platformService.delete(platform.id);
      }
    } else {
      errorMessage = "Platform to delete not found";
    }
  }

  // Fetch platform to edit
  let editPlatform: Platform;
  if (forms.isId(req.query.edit)) {
    editPlatform = await platformRepository.findById(forms.parseInt(req.query.edit.toString()));
  } else if (req.query.create) {
    editPlatform = platformRepository.createPlatform("");
  }

  // Count entries by platform
  const platforms = await platformService.findAll();
  const entryCountByPlatform: Record<number, number> = {};
  for (const platform of platforms) {
    entryCountByPlatform[platform.get("id")] = await platformRepository.countEntriesByPlatform(platform);
  }

  res.render<AdminPlatformsContext>("admin/platforms/admin-platforms", {
    ...res.locals,
    platforms,
    entryCount: entryCountByPlatform,
    editPlatform,
    errorMessage,
  });
}
