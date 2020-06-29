import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import { nunjuckMacro } from "server/macros/nunjucks-macros";

const EVENT_MACROS_PATH = "event/event.macros.html"

export function entryPlatformIcon(platformName: string, options: { hideLabel?: boolean } = {}, context: CommonLocals) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(EVENT_MACROS_PATH, "entryPlatformIcon", [platformName, options], context)} />;
}
