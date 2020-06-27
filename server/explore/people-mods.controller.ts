
import { CommonLocals } from "server/common.middleware";
import { User } from "server/entity/user.entity";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";

export interface PeopleModsContext extends CommonLocals {
  admins: User[];
  mods: User[];
}

export async function peopleMods(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  res.locals.pageTitle = "Admins & mods";

  const admins = await userService.findUsers({ isAdmin: true, orderBy: "title" });
  const modsAndAdmins = await userService.findUsers({ isMod: true, orderBy: "title" });
  const mods = modsAndAdmins.filter(user => !admins.find(admin => admin.id === user.id));

  res.renderJSX<PeopleModsContext>("explore/people-mods", {
    ...res.locals,
    mods,
    admins
  });
}
