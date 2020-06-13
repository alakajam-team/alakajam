import { CommonLocals } from "server/common.middleware";
import { renderInBaseTemplate } from "server/macros/nunjucks-macros";

export interface AdminBaseContext extends CommonLocals {
  infoMessage?: string;
  errorMessage?: string;
}

export default function adminBase(context: AdminBaseContext, contentsBlock: JSX.Element) {
  return renderInBaseTemplate("admin/admin.base.html", context, "adminBody", contentsBlock);
}
