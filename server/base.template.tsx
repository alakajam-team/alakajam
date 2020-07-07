import { JSX } from "preact";
import { CommonLocals } from "./common.middleware";
import { renderInBaseTemplate } from "./macros/nunjucks-macros";

export default function base<T extends CommonLocals>(context: T, contentsBlock: JSX.Element) {
  (context as any).context = context; // Context
  return renderInBaseTemplate("base.html", context, "body", contentsBlock);
}
