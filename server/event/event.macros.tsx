import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import { nunjuckMacro } from "server/macros/nunjucks-macros";
import { BookshelfModel } from "bookshelf";

const EVENT_MACROS_PATH = "event/event.macros.html";

export function entryThumb(entry: BookshelfModel, options: {
  hideMedals?: boolean;
  showEvent?: boolean;
  showKarma?: boolean;
} = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(EVENT_MACROS_PATH, "entryThumb", [entry, options])} />;
}

export function entrySmallThumb(entry: BookshelfModel, options: { noShadow?: boolean; customMessage?: string } = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(EVENT_MACROS_PATH, "entrySmallThumb", [entry, options])} />;
}

export function eventBanner(event: BookshelfModel) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(EVENT_MACROS_PATH, "eventBanner", [event])} />;
}

export function entryPlatformIcon(platformName: string, options: { hideLabel?: boolean } = {}, context: CommonLocals) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(EVENT_MACROS_PATH, "entryPlatformIcon", [platformName, options], context)} />;
}

export function eventThemeStatus(theme: BookshelfModel, options: { uncensored?: boolean } = {}) {
  return <span dangerouslySetInnerHTML={nunjuckMacro(EVENT_MACROS_PATH, "eventThemeStatus", [theme, options])} />;
}

export function eventShortcutMyEntry(user: BookshelfModel, event: BookshelfModel, userEntry: BookshelfModel, options: { noTitle?: boolean } = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(EVENT_MACROS_PATH, "eventShortcutMyEntry", [user, event, userEntry, options])} />;
}

export function eventShortcutMyPost(user: BookshelfModel, event: BookshelfModel, post: BookshelfModel,
                                    options: { noTitle?: boolean; buttonsOnly?: boolean } = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(EVENT_MACROS_PATH, "eventShortcutMyPost", [user, event, post, options])} />;
}
