import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import { User } from "server/entity/user.entity";
import { nunjuckMacro } from "server/macros/nunjucks-macros";

const USER_MACROS_PATH = "user/user.macros.html";

export function userThumb(user: BookshelfModel, options: {
  fullWidth?: boolean;
  centered?: boolean;
  pending?: boolean;
} | number = {}): { __html: string } {
  // Add support as Array.map() callback
  if (typeof options === "number") {
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

export function twitchLink(user: User) {
  return <span dangerouslySetInnerHTML={nunjuckMacro(USER_MACROS_PATH, "twitchLink", [user])} />;
}

export function twitchEmbed(twitchUsername: string, options: { height?: number; unmute?: boolean } = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(USER_MACROS_PATH, "twitchEmbed", [twitchUsername, options])} />;
}

export function registerTwitchEmbedScripts(context: CommonLocals) {
  context.scripts.push("https://embed.twitch.tv/embed/v1.js");
}
