import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import forms from "server/core/forms";
import security from "server/core/security";
import { CustomRequest, CustomResponse } from "server/types";
import tagService from "../../entry/tag/tag.service";

/**
 * Admin only: Tags management
 */
export async function adminTags(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  if (!config.DEBUG_ADMIN && !security.isAdmin(res.locals.user)) {
    res.errorPage(403);
  }

  let errorMessage: string | null = null;

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
  let detailedTag: BookshelfModel | null = null;
  if (forms.isId(req.query.view)) {
    detailedTag = await tagService.fetchById(req.query.view, { withRelated: "entries.userRoles" });
  }

  // Custom sorting
  const fetchTagsOptions: { orderByDate?: boolean } = {};
  let sortBy = null;
  if (req.query.sortBy === "date") {
    fetchTagsOptions.orderByDate = true;
    sortBy = "date";
  }

  res.render("admin/tags/admin-tags", {
    tags: await tagService.fetchTagStats(fetchTagsOptions),
    sortBy,
    detailedTag,
    errorMessage,
  });
}
