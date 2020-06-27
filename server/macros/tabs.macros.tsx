import * as React from "preact";
import { JSX } from "preact";
import { nunjuckMacro } from "server/macros/nunjucks-macros";

const TAB_MACROS_PATH = "macros/tabs.macros.html";

export function peopleTabs(path: string): JSX.Element {
  const htmlObject = nunjuckMacro(TAB_MACROS_PATH, "people", undefined, { path });
  return <div dangerouslySetInnerHTML={htmlObject}></div>;
}
