import { shuffle } from "lodash";
import NodeCache from "node-cache";
import config from "server/core/config";

export interface CaptchaQuestion {
  key: string;
  questionMarkdown: string;
}

export interface CaptchaAnswer {
  key: string;
  answer: string;
}

export class CaptchaService {

  private validCaptchaKeys = new NodeCache({ stdTTL: 30 * 60 /* 30 minutes */ });

  public generateCaptcha(): CaptchaQuestion {
    const things = [
      this.randomPick(config.CAPTCHA_GROUP_SMALL),
      ...shuffle([
        this.randomPick(config.CAPTCHA_GROUP_LARGE),
        this.randomPick(config.CAPTCHA_GROUP_SMALL),
        this.randomPick(config.CAPTCHA_GROUP_SMALL),
        this.randomPick(config.CAPTCHA_GROUP_SMALL)
      ])
    ];

    // Register the captcha generation in memory
    const key = things.map(thing => thing.label).join("|");
    this.validCaptchaKeys.set(key, true);

    return {
      key,
      questionMarkdown: `Which one of these things is the largest?<br />
| ${things.map(thing => thing.label).join(" | ")} |
| ${things.map(_ => "---").join(" | ")} |
| ${things.map(thing => `<i class="${thing.icon}"></i>`).join("    |    ")} |`
    };
  }

  public validateCaptcha(captchaAnswer: CaptchaAnswer): boolean {
    if (config.DEBUG_DISABLE_CAPTCHA) {
      return true;
    }

    // Make sure the answer wasn't forged
    if (!this.validCaptchaKeys.has(captchaAnswer.key)) {
      return false;
    }
    this.validCaptchaKeys.del(captchaAnswer.key);

    // Verify answer
    const largeLabels = config.CAPTCHA_GROUP_LARGE.map(thing => thing.label);
    const expectedAnswer = captchaAnswer.key.split("|").find(keyword => largeLabels.includes(keyword));
    return expectedAnswer === captchaAnswer.answer.toLowerCase().trim();
  }

  private randomPick<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)];
  }

}

export default new CaptchaService();
