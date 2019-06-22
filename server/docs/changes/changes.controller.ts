
import fileStorage from "server/core/file-storage";
import settings from "server/core/settings";

export async function changes(req, res) {
  res.locals.pageTitle = "Site changes";
  res.locals.changes = await fileStorage.read("CHANGES.md");

  res.render("docs/changes/changes", {
    sidebar: await settings.findArticlesSidebar(),
  });
}
