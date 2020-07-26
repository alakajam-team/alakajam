import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import forms from "server/core/forms";
import security from "server/core/security";
import { CustomRequest, CustomResponse } from "server/types";
import tagService, { TagStats } from "../../entry/tag/tag.service";
import { AdminBaseContext } from "../admin.base";

export interface AdminTagsContext extends AdminBaseContext {
  tags: TagStats[];
  detailedTag?: BookshelfModel;
  sortBy?: string;
}

/**
 * Admin only: Tags management
 */
export async function adminTags(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  if (!config.DEBUG_ADMIN && !security.isAdmin(res.locals.user)) {
    res.errorPage(403);
  }

  let errorMessage: string;

  // Tag deletion
  if (forms.isId(req.query.delete)) {
    const tag = await tagService.fetchById(req.query.delete);
    if (tag) {
      await tag.destroy();
    } else {
      errorMessage = "Tag to delete not found";
    }
  }

  // Detailed tag view
  let detailedTag: BookshelfModel;
  if (forms.isId(req.query.view)) {
    detailedTag = await tagService.fetchById(req.query.view, { withRelated: "entries.userRoles" });
  }

  // Custom sorting
  const fetchTagsOptions: { orderByDate?: boolean } = {};
  let sortBy;
  if (req.query.sortBy === "date") {
    fetchTagsOptions.orderByDate = true;
    sortBy = "date";
  }

  res.render<AdminTagsContext>("admin/tags/admin-tags", {
    ...res.locals,
    tags: await tagService.fetchTagStats(fetchTagsOptions),
    sortBy,
    detailedTag,
    errorMessage,
  });
}
