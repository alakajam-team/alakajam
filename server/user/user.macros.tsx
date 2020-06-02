import { nunjuckMacro } from "server/macros/nunjucks-macros";
import { User } from "server/entity/user.entity";

const USER_MACROS_PATH = "user/user.macros.html";

export function userThumb(user: User, options: { fullWidth?: boolean; centered?: boolean; pending?: boolean } | number = {}): { __html: string } {
  // Add support as Array.map() callback 
  if (typeof options === 'number') {
    options = {};
  }

  return nunjuckMacro(USER_MACROS_PATH, "userThumb", [user, options]);
}

export function userAvatar(user: User, options: { small?: boolean } = {}): { __html: string } {
  return nunjuckMacro(USER_MACROS_PATH, "userAvatar", [user, options]);
}

export function userLink(user: User): { __html: string } {
  return nunjuckMacro(USER_MACROS_PATH, "userLink", [user]);
}
