import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse } from "server/types";
import passwordRecoveryService from "../password-recovery/password-recovery.service";

/**
 * Password change page, following the click on a password recovery link.
 */
export async function passwordRecovery(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  let errorMessage: string | null = null;

  if (res.locals.user) {
    res.redirect("/");
    return;
  }

  if (passwordRecoveryService.validatePasswordRecoveryToken(res.app, req.query.token)) {
    res.locals.token = true;

    if (req.method === "POST") {
      if (!req.body["new-password"]) {
        errorMessage = "You must enter a new password";
      } else if (req.body["new-password"] !== req.body["new-password-bis"]) {
        errorMessage = "New passwords do not match";
      } else {
        const result = await passwordRecoveryService.recoverPasswordUsingToken(res.app, req.query.token, req.body["new-password"]);
        if (result === true) {
          res.locals.success = true;
        } else {
          errorMessage = result;
        }
      }
    }
  }

  if (errorMessage) {
    res.locals.alerts.push({ type: "danger", message: errorMessage });
  }

  res.render("user/authentication/password-recovery");
}
