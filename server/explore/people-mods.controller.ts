
import { BookshelfCollection } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";

export async function peopleMods(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  res.locals.pageTitle = "Admins & mods";

  const adminsCollection = await userService.findUsers({ isAdmin: true, orderBy: "title" }) as BookshelfCollection;
  const modsCollection = await userService.findUsers({ isMod: true, orderBy: "title" }) as BookshelfCollection;
  modsCollection.remove(adminsCollection.models);

  res.render("explore/people-mods", {
    mods: modsCollection.models,
    admins: adminsCollection.models,
  });
}
