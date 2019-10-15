
/**
 * Utilities made available in all templates
 */

import { BookshelfModel } from "bookshelf";
import forms from "./forms";
import links from "./links";
import security from "./security";

export class TemplatingFunctions {

  public routeUrl = links.routeUrl.bind(links);
  public pictureUrl = links.pictureUrl.bind(links);
  public staticUrl = links.staticUrl.bind(links);

  public isUserWatching = security.isUserWatching.bind(security);
  public canUserRead = security.canUserRead.bind(security);
  public canUserWrite = security.canUserWrite.bind(security);
  public canUserManage = security.canUserManage.bind(security);
  public isAdmin = security.isAdmin.bind(security);
  public isMod = security.isMod.bind(security);
  public min = Math.min;
  public max = Math.max;

  public isId = forms.isId;
  public isPast = forms.isPast;

}

export default new TemplatingFunctions();
