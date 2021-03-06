
import { CommonLocals } from "server/common.middleware";
import fileStorage from "server/core/file-storage";
import settings from "server/core/settings";
import { CustomRequest, CustomResponse } from "server/types";

export async function changes(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  res.locals.pageTitle = "Site changes";
  res.locals.changes = await fileStorage.read("CHANGES.md");

  res.render<CommonLocals>("docs/changes/changes", {
    ...res.locals,
    sidebar: await settings.findArticlesSidebar("about"),
  });
}
