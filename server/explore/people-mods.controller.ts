
import userService from "server/user/user.service";

export async function peopleMods(req, res) {
  res.locals.pageTitle = "Admins & mods";

  const adminsCollection = await userService.findUsers({ isAdmin: true, orderBy: "title" });
  const modsCollection = await userService.findUsers({ isMod: true, orderBy: "title" });
  modsCollection.remove(adminsCollection.models);

  res.render("explore/people-mods", {
    mods: modsCollection.models,
    admins: adminsCollection.models,
  });
}
