import * as React from "preact";
import { nunjuckMacro } from "server/macros/nunjucks-macros";

const TAB_MACROS_PATH = "macros/tabs.macros.html";

export function peopleTabs(): JSX.Element {
  const htmlObject = nunjuckMacro(TAB_MACROS_PATH, "people");
  return <div dangerouslySetInnerHTML={htmlObject}></div>;
}
