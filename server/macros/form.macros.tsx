import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";

export function registerCodeMirrorScripts(locals: CommonLocals) {
  locals.scripts.push(
    links.staticUrl("/static/scripts/codemirror.min.js"),
    links.staticUrl("/static/scripts/matchbrackets.min.js"),
    links.staticUrl("/static/scripts/closebrackets.min.js"),
    links.staticUrl("/static/scripts/codemirror-jsonconf.min.js"),
    links.staticUrl("/static/scripts/codemirror-autorefresh.min.js")
  );
}
