import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import forms from "server/core/forms";
import { allRules, rule, validateForm } from "server/core/forms-validation";
import security from "server/core/security";
import { CustomRequest, CustomResponse } from "server/types";
import userServiceSingleton, { UserService } from "server/user/user.service";
import captchaServiceSingleton, { CaptchaService } from "../captcha.service";
import userTimezoneServiceSingleton, { TimezoneOption, UserTimeZoneService } from "../user-timezone.service";
import { loginPost } from "./login.controller";
import { USER_MARKETING_SETTINGS } from "server/entity/transformer/user-marketing-setting.transformer";

export const TEMPLATE_REGISTER = "user/authentication/register";

export interface RegisterContext extends CommonLocals {
  timezones: TimezoneOption[];
}
export class RegisterController {

  public constructor(
    private userService: UserService = userServiceSingleton,
    private userTimezoneService: UserTimeZoneService = userTimezoneServiceSingleton,
    private captchaService: CaptchaService = captchaServiceSingleton) { }

  /**
   * Register form
   */
  public async registerForm(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
    res.locals.pageTitle = "Register";

    if (config.READ_ONLY_MODE) {
      res.errorPage(401, "Website is in read-only mode");
      return;
    }
    if (security.isAuthenticated(res.locals.user)) {
      res.redirect("/");
      return;
    }

    res.render<RegisterContext>(TEMPLATE_REGISTER, {
      ...req.body,
      ...res.locals,
      timezones: await this.userTimezoneService.getAllTimeZonesAsOptions()
    });
  }

  /**
   * Register
   */
  public async register(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
    res.locals.pageTitle = "Register";

    if (config.READ_ONLY_MODE) {
      res.errorPage(401, "Website is in read-only mode");
      return;
    }

    const captchaValidator = () => this.captchaService.validateCaptcha(req.body["h-captcha-response"]);

    const formAlerts = await validateForm(req.body, {
      "name": allRules(
        rule(forms.isSet, "Name is not set"),
        rule(forms.isUsername,
          "Your usename is too weird (either too short, "
          + "or has special chars other than '_' or '-', or starts with a number)")),
      "email": rule(forms.isSet, "Email is not set"),
      "password": rule(forms.isSet, "Password is not set"),
      "password-bis": rule((passwordBis) => passwordBis === req.body.password,
        "Passwords do not match"),
      "captcha": rule(captchaValidator, "You didn't pass the human verification test"),
      "gotcha": rule((gotcha) => gotcha?.trim() === "", "You didn't pass the human verification test"),
      "terms-and-conditions": rule(forms.isSet, "The privacy policy must be accepted"),
    });

    if (!formAlerts) {
      const result = await this.userService.register(req.body.email, req.body.name, req.body.password, req);

      if (typeof result === "object") {
        const user = result;
        user.set("timezone", forms.sanitizeString(req.body.timezone));
        user.marketing.set("setting", forms.sanitizeEnum(req.body.email_marketing, USER_MARKETING_SETTINGS, "off"));
        await this.userService.save(user);
        await loginPost(req, res);
        return;

      } else {
        res.locals.alerts.push({
          type: "danger",
          message: result
        });
      }

    } else {
      res.locals.alerts.push(...formAlerts);
    }

    await this.registerForm(req, res);
  }

}

export default new RegisterController();
