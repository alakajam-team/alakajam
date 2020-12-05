import { CommonLocals } from "server/common.middleware";
import forms from "server/core/forms";
import { CustomRequest, CustomResponse } from "server/types";
import passwordRecoveryService from "../../password-recovery/password-recovery.service";

export async function passwordRecoveryRequest(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  let errorMessage: string | null = null;

  if (res.locals.user) {
    res.redirect("/");
    return;
  }

  if (req.method === "POST") {
    if (!forms.isEmail(req.body.email)) {
      errorMessage = "Invalid email address";
    }

    if (!errorMessage) {
      try {
        await passwordRecoveryService.sendPasswordRecoveryEmail(res.app, req.body.email);
        res.locals.success = true;
      } catch (err) {
        errorMessage = err.message;
      }
    }
  }

  if (errorMessage) {
    res.locals.alerts.push({ type: "danger", message: errorMessage });
  }

  res.render<CommonLocals>("user/authentication/password-recovery/password-recovery-request", res.locals);
}
