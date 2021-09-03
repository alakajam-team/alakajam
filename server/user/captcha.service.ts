import { verify as hcaptchaVerify } from "hcaptcha";
import config from "server/core/config";
import log from "server/core/log";

export class CaptchaService {

  public async validateCaptcha(token: string): Promise<boolean> {
    if (config.DEBUG_DISABLE_CAPTCHA) {
      return true;
    }
    if (!config.HCAPTCHA_SECRET) {
      log.warn("hCaptcha is not correctly set up, bypassing it.");
      return true;
    }

    const response = await hcaptchaVerify(config.HCAPTCHA_SECRET, token, undefined, config.HCAPTCHA_SITEKEY);

    return response.success;
  }

}

export default new CaptchaService();
